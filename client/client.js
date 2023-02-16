'use strict';

let localStream;
let remoteStream;
let peerConnection;
let isBroadcaster;
let peer;

let _height = 480;
let _width = 270;

// the background image
const bgImage = new Image(_height, _width);
bgImage.src = '/img/blur.jpg';

// an OffscreenCanvas that combines background and human pixels
const canvas = new OffscreenCanvas(_height, _width);
const ctx = canvas.getContext("2d");

const videoEl = document.getElementById('local-video');


navigator.mediaDevices.getUserMedia({ 
  video: { width: _height, height: _width, frameRate: { ideal: 15, max: 30 } },
  audio: false
})
  .then((stream) => {
    background_removal(stream.getVideoTracks()[0]);
  })
  .catch((error) => {
    console.error(error);
  });


  // js/main.js

function background_removal(videoTrack) {
  // instance of SelfieSegmentation object
  const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

  // set the model and mode
  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: true,
  });
  
  // set the callback function for when it finishes segmenting
  selfieSegmentation.onResults(onResults);

// definition of track processor and generator
  const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
  const trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });

  // transform function
  const transformer = new TransformStream({
    async transform(videoFrame, controller) {
      // we send the video frame to MediaPipe
      videoFrame.width = videoFrame.displayWidth;
      videoFrame.height = videoFrame.displayHeight;
      await selfieSegmentation.send({ image: videoFrame });

      // we create a new videoFrame
      const timestamp = videoFrame.timestamp;
      const newFrame = new VideoFrame(canvas, {timestamp});

      // we close the current videoFrame and queue the new one
      videoFrame.close();
      controller.enqueue(newFrame);
    }
  });

  // we pipe the stream through the transform function
  trackProcessor.readable
    .pipeThrough(transformer)
    .pipeTo(trackGenerator.writable)

  // add the new mediastream to video element
  const processedStream = new MediaStream();
  processedStream.addTrack(trackGenerator);

  videoEl.srcObject = processedStream;
}

function onResults(results) {
  ctx.save();
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.drawImage(
    results.segmentationMask,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.globalCompositeOperation = "source-out";
  const pat = ctx.createPattern(bgImage, "no-repeat");
  ctx.fillStyle = pat;
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Only overwrite missing pixels.
  ctx.globalCompositeOperation = "destination-atop";
  ctx.drawImage(
    results.image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.restore();
}
