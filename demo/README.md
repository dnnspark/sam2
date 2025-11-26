# SAM 2 Demo

Welcome to the SAM 2 Demo! This project consists of a frontend built with React TypeScript and Vite and a backend service using Python Flask and Strawberry GraphQL. Both components can be run in Docker containers or locally on MPS (Metal Performance Shaders) or CPU. However, running the backend service on MPS or CPU devices may result in significantly slower performance (FPS).

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- Docker and Docker Compose
- [OPTIONAL] Node.js and Yarn for running frontend locally
- [OPTIONAL] Anaconda for running backend locally

### Installing Docker

To install Docker, follow these steps:

1. Go to the [Docker website](https://www.docker.com/get-started)
2. Follow the installation instructions for your operating system.

### [OPTIONAL] Installing Node.js and Yarn

To install Node.js and Yarn, follow these steps:

1. Go to the [Node.js website](https://nodejs.org/en/download/).
2. Follow the installation instructions for your operating system.
3. Once Node.js is installed, open a terminal or command prompt and run the following command to install Yarn:

```
npm install -g yarn
```

### [OPTIONAL] Installing Anaconda

To install Anaconda, follow these steps:

1. Go to the [Anaconda website](https://www.anaconda.com/products/distribution).
2. Follow the installation instructions for your operating system.

## Quick Start

To get both the frontend and backend running quickly using Docker, you can use the following command:

```bash
docker compose up --build
```

> [!WARNING]
> On macOS, Docker containers only support running on CPU. MPS is not supported through Docker. If you want to run the demo backend service on MPS, you will need to run it locally (see "Running the Backend Locally" below).

This will build and start both services. You can access them at:

- **Frontend:** [http://localhost:7262](http://localhost:7262)
- **Backend:** [http://localhost:7263/graphql](http://localhost:7263/graphql)

### Accessing the demo from a remote Linux host

If the containers are running on a remote machine (e.g., `ssh g6-ec2`), keep `docker compose up --build` running there and forwa
rd the ports to your macOS laptop:

```bash
ssh -N \
  -L 7262:localhost:7262 \
  -L 7263:localhost:7263 \
  g6-ec2
```

Leave the SSH session open, then browse locally to `http://localhost:7262` (frontend) and `http://localhost:7263/graphql` (back
end). The “Change video” upload picker in the frontend will send the file directly from your laptop through the SSH tunnel to th
e backend; the backend saves uploads under `demo/data/uploads` inside the container via the bind mount defined in `docker-compos
e.yaml`. No extra `scp` is required.

## Running Backend with MPS Support

MPS (Metal Performance Shaders) is not supported with Docker. To use MPS, you need to run the backend on your local machine.

### Setting Up Your Environment

1. **Create Conda environment**

   Create a new Conda environment for this project by running the following command or use your existing conda environment for SAM 2:

   ```
   conda create --name sam2-demo python=3.10 --yes
   ```

   This will create a new environment named `sam2-demo` with Python 3.10 as the interpreter.

2. **Activate the Conda environment:**

   ```bash
   conda activate sam2-demo
   ```

3. **Install ffmpeg**

   ```bash
   conda install -c conda-forge ffmpeg
   ```

4. **Install SAM 2 demo dependencies:**

Install project dependencies by running the following command in the SAM 2 checkout root directory:

```bash
pip install -e '.[interactive-demo]'
```

### Running the Backend Locally

Download the SAM 2 checkpoints:

```bash
(cd ./checkpoints && ./download_ckpts.sh)
```

Use the following command to start the backend with MPS support:

```bash
cd demo/backend/server/
```

```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 \
APP_ROOT="$(pwd)/../../../" \
API_URL=http://localhost:7263 \
MODEL_SIZE=base_plus \
DATA_PATH="$(pwd)/../../data" \
DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4 \
gunicorn \
    --worker-class gthread app:app \
    --workers 1 \
    --threads 2 \
    --bind 0.0.0.0:7263 \
    --timeout 60
```

Options for the `MODEL_SIZE` argument are "tiny", "small", "base_plus" (default), and "large".

> [!WARNING]
> Running the backend service on MPS devices can cause fatal crashes with the Gunicorn worker due to insufficient MPS memory. Try switching to CPU devices by setting the `SAM2_DEMO_FORCE_CPU_DEVICE=1` environment variable.

### Starting the Frontend

If you wish to run the frontend separately (useful for development), follow these steps:

1. **Navigate to demo frontend directory:**

   ```bash
   cd demo/frontend
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   ```

3. **Start the development server:**

   ```bash
   yarn dev --port 7262
   ```

This will start the frontend development server on [http://localhost:7262](http://localhost:7262).

## Docker Tips

- To rebuild the Docker containers (useful if you've made changes to the Dockerfile or dependencies):

  ```bash
  docker compose up --build
  ```

- To stop the Docker containers:

  ```bash
  docker compose down
  ```

## End-to-end workflow: uploading, labeling, and tracking your own video

When you upload your own clip (or a folder of frames converted to a video file), the frontend and backend coordinate through GraphQL mutations and the streaming propagation route to turn clicks into per-frame masks:

1. **Upload and choose the source video.** Selecting the upload option in the gallery triggers the `uploadVideo` GraphQL mutation with a multipart request carrying your file. The backend stores the transcoded video under the uploads directory and returns its path and metadata so the gallery list can include it. 【F:demo/frontend/src/common/components/gallery/useUploadVideo.ts†L29-L119】【F:demo/backend/server/data/schema.py†L54-L120】【F:demo/backend/server/data/schema.py†L292-L343】
2. **Start a segmentation session.** Once the uploaded video is selected, the frontend calls the `startSession` mutation with the chosen path. The backend initializes a new `InferenceAPI` session keyed by a fresh UUID and loads the video frames so future mutations share that state. The tracker worker caches the session ID and creates the first empty tracklet. 【F:demo/frontend/src/common/tracker/SAM2Model.ts†L98-L155】【F:demo/backend/server/data/schema.py†L122-L170】【F:demo/backend/server/inference/predictor.py†L57-L115】
3. **Add an object by clicking points.** When you click positive/negative points on a frame and press **Add object**, the tracker normalizes the coordinates and commits the `addPoints` mutation. The backend’s `add_points` resolver calls `InferenceAPI.add_points`, which updates the predictor with the prompts for that frame, converts the resulting masks to RLE, and returns them so the UI can display the foreground mask immediately. 【F:demo/frontend/src/common/tracker/SAM2Model.ts†L298-L370】【F:demo/backend/server/data/schema.py†L172-L214】【F:demo/backend/server/inference/predictor.py†L117-L179】
4. **Repeat for a second object.** Adding another object repeats the same `addPoints` flow but with a new tracklet ID, letting you confirm both masks on the reference frame before tracking.
5. **Track across the video.** Clicking **Track** calls `streamMasks`, which posts the session ID and starting frame to `/propagate_in_video` and listens to the multipart stream. Each chunk of JSON masks is parsed and mapped back onto the existing tracklets; the backend generates those chunks by iterating `InferenceAPI.propagate_in_video`, which runs forward and backward propagation from the chosen frame. When streaming finishes, the UI has a full set of per-frame masks for each object. 【F:demo/frontend/src/common/tracker/SAM2Model.ts†L424-L575】【F:demo/backend/server/app.py†L96-L109】【F:demo/backend/server/inference/predictor.py†L244-L328】

This flow keeps the interactive loop tight: point clicks are echoed back as instant per-frame masks via GraphQL, and full-video tracks arrive incrementally through the streaming endpoint so you can watch propagation progress in the editor.

## Contributing

Contributions are welcome! Please read our contributing guidelines to get started.

## License

See the LICENSE file for details.

---

By following these instructions, you should have a fully functional development environment for both the frontend and backend of the SAM 2 Demo. Happy coding!
