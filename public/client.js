window.onload = function() {

  navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
  window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
  window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition 
    || window.msSpeechRecognition || window.oSpeechRecognition;

  var localVideoElem = null,
    remoteVideoElem = null,
    localVideoStream = null,
    videoCallButton = null, 
    endCallButton = null,
    peerConn = null;

   var name = prompt("What's your name?");
   var room = prompt("Enter the group no.");

   var wcs = new WebSocket("wss://127.0.0.1:8008");
   
   var peerConnCfg = {'iceServers':
      [{'url': 'stun:stun.services.mozilla.com'},
      {'url': 'stun:stun.l.google.com:19302'}]
   };

   wcs.onopen = function() {
      wcs.send(JSON.stringify({
         type: "info", Name: name, Room: room
      }));
   }

   // check browser WebRTC availability 
   if(navigator.getUserMedia) {
      videoCallButton = document.getElementById("videoCallButton");
      endCallButton = document.getElementById("endCallButton");
      localVideo = document.getElementById('localVideo');
      remoteVideo = document.getElementById('remoteVideo');
      videoCallButton.removeAttribute("disabled");
      videoCallButton.addEventListener("click", initiateCall);
      endCallButton.addEventListener("click", function (evt) {
         wcs.send(JSON.stringify({"closeConnection": true }));
      });
   }
   else {
      alert("Sorry, your browser does not support WebRTC!")
   }

  function prepareCall() {
    peerConn = new RTCPeerConnection(peerConnCfg);
    // send any ice candidates to the other peer
    peerConn.onicecandidate = onIceCandidateHandler;
    // once remote stream arrives, show it in the remote video element
    peerConn.onaddstream = onAddStreamHandler;
  };

  // run start(true) to initiate a call
  function initiateCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
      localVideoStream = stream;
      localVideo.src = URL.createObjectURL(localVideoStream);
      peerConn.addStream(localVideoStream);
      createAndSendOffer();
    }, function(error) { console.log(error);});
  };

  function answerCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
      localVideoStream = stream;
      localVideo.src = URL.createObjectURL(localVideoStream);
      peerConn.addStream(localVideoStream);
      createAndSendAnswer();
    }, function(error) { console.log(error);});
  };

  wcs.onmessage = function (evt) {
    var signal = null;
    if (!peerConn) answerCall();
    signal = JSON.parse(evt.data);
    if (signal.sdp) {
      console.log("Received SDP from remote peer.");
      peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    else if (signal.candidate) {
      console.log("Received ICECandidate from remote peer.");
      peerConn.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } else if ( signal.closeConnection){
      console.log("Received 'close call' signal from remote peer.");
      endCall();
    }
  };

  function createAndSendOffer() {
    peerConn.createOffer(
      function (offer) {
        var off = new RTCSessionDescription(offer);
        peerConn.setLocalDescription(new RTCSessionDescription(off), 
          function() {
            wcs.send(JSON.stringify({"sdp": off }));
          }, 
          function(error) { console.log(error);}
        );
      }, 
      function (error) { console.log(error);}
    );
  };

  function createAndSendAnswer() {
    peerConn.createAnswer(
      function (answer) {
        var ans = new RTCSessionDescription(answer);
        peerConn.setLocalDescription(ans, function() {
            wcs.send(JSON.stringify({"sdp": ans }));
          }, 
          function (error) { console.log(error);}
        );
      },
      function (error) {console.log(error);}
    );
  };

  function onIceCandidateHandler(evt) {
    if (!evt || !evt.candidate) return;
    wcs.send(JSON.stringify({"candidate": evt.candidate }));
    console.log(evt.candidate);
  };

  function onAddStreamHandler(evt) {
    videoCallButton.setAttribute("disabled", true);
    endCallButton.removeAttribute("disabled"); 
    // set remote video stream as source for remote video HTML5 element
    remoteVideo.src = URL.createObjectURL(evt.stream);
  };

  function endCall() {
    peerConn.close();
    peerConn = null;
    videoCallButton.removeAttribute("disabled");
    endCallButton.setAttribute("disabled", true);
    if (localVideoStream) {
      localVideoStream.getTracks().forEach(function (track) {
        track.stop();
      });
      localVideo.src = "";
    }
    if (remoteVideo) remoteVideo.src = "";
  };

};