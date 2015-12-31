
/*global Phaser*/
/*global Streamy*/
/*global _*/
/*global Players*/
/*global Balls*/
/*global Worlds*/



console.log("begin ballsclient.js");


let m_game;

let m_clientBallsView = {};

let m_myPlayerId = 0;

let m_debugTextLabel;
let m_logTextLabel;

let m_serverTimeDifference = 0;
let m_lag = 0;
 
let m_hasCompleteConnection = false;
let m_phaserCreated = false;


function registerClient () {
  
  console.log('calling register client');
  
  Meteor.call('registerClient', {someInitial:"stuff"}, function(err, data) {
    
    console.log('registerClient returns:', data);
    m_myPlayerId = data.playerId;
    
    
    if(!m_phaserCreated){
      loadPhaserGame();
    }

  });

}

Meteor.startup(function(){
  console.log("meteor startup");

  registerClient();
});


  
function loadPhaserGame() {
  
  console.log("loading phaser...");
  
  $.getScript('//cdn.jsdelivr.net/phaser/2.4.4/phaser.min.js', function() {
    
    let viewWidth = $(window).innerWidth();
    let viewHeight = $(window).innerHeight();

    //console.log("view width and height:", viewWidth, viewHeight);
    m_game = new Phaser.Game(viewWidth, viewHeight, Phaser.AUTO, '', { create: create, update: update });
    console.log("phaser loaded");
  });

}




function create () {
  
  m_phaserCreated = true;

  
  $(window).resize(function() { resizeGame(); } );

  resizeGame();

  
  m_game.stage.backgroundColor = "0xFFFFFF";

  m_game.stage.disableVisibilityChange = true;

  let x = 10;
  let y = 10;
  m_debugTextLabel = m_game.add.text(x, y += 20, '', { font: "16px Arial", fill: '#000000' });

  // addButton(x, y += 20, "modify world1", function() {
  //   log("modifying world");
  //   let world = Worlds.findOne();
  //   Worlds.update({_id:world._id}, {$set:{width:300}});
  //   world = Worlds.findOne();
  //   console.log("new width:", world.width);
  // });

  m_logTextLabel = m_game.add.text(x, y+=20, '', { font: "16px Arial", fill: '#000000' });

  m_game.input.onDown.add(onMouseDown, this);
  m_game.input.onUp.add(onMouseUp, this);

  m_debugTextLabel.inputEnabled = true;
  
  //m_debugTextLabel.events.onInputDown.add(onDebugTextLabelMouseDown, this);
  // addButton(x, y += 20, "send something to all", function() {
  //   log("sending something");
  //   Streamy.broadcast("goumbaman", {playerId:m_myPlayerId, someData:"craphead"});
  // });
  // addButton(x, y += 20, "send something to all", function() {
  //   log("sending something");
  //   Streamy.broadcast("goumbaman", {playerId:m_myPlayerId, someData:"craphead"});
  // });


  
  Players.find().observe({
    added: function(player){
      console.log("new player", player);
      log("new player:" + player._id);
    },
    removed: function(player){
      console.log("removed player", player);
      log("player disconnected:" + player._id);
    }
  });

  
  setInterval(updateOneSec, 1000);
}

function resizeGame(){
  console.log("resizing");
  let width = $(window).innerWidth();
  let height = $(window).innerHeight();
  console.log("width:", width);
  m_game.width = width;
  m_game.height = height;

  if (m_game.renderType === Phaser.WEBGL) {
  	m_game.renderer.resize(width, height);
  }

  let world = Worlds.findOne(); 
  if(world != undefined){
    updateGameWorld(world);
  }

}

function updateGameWorld(world){
  m_game.world.setBounds(0, 0, world.width, world.height);
}



Balls.find().observe({

  removed: function(ball){
    console.log("removed ball", ball);
    //log("client disconnected:" + player._id);
    if(m_clientBallsView[ball._id] != undefined) {
      m_clientBallsView[ball._id].destroy();
      delete m_clientBallsView[ball._id];
    }
  }
});

Worlds.find().observe({
  added: function(world) {
    console.log("updating world");
    if(m_phaserCreated){
      updateGameWorld(world);
    }
  },
  changed: function(world){
    console.log("updating world");
    if(m_phaserCreated){
      updateGameWorld(world);
    }
  }
});


function addButton (x, y, buttonText, callback) {
  let btn = m_game.add.text(x, y, buttonText, { font: "16px Arial", fill: '#000000' });
  btn.inputEnabled = true;
  btn.events.onInputDown.add(callback, this);
}

function onMouseDown () {
  //log("mouseDown\n");
}

function onMouseUp () {
  //log("mouseUp\n");
}

function log (newLogText) {
  if(m_phaserCreated){
    m_logTextLabel.text = newLogText + "\n" + m_logTextLabel.text;
  }
}


function update () {
  
  updateMyPlayer();
  

  let ballsArray = Balls.find({}).fetch();
  
  ballsArray.forEach(function (ball) {
    let ballId = ball._id;
    
    // update ball view
    let clientBallView = m_clientBallsView[ballId];
    
    if(clientBallView == undefined)
    {
      //log("ballview undefined");
      clientBallView = m_game.add.graphics(0, 0);
      clientBallView.lineStyle(2, 0x000000);
      
      let ballRadius = ball.radius;
       
      clientBallView.drawCircle(0, 0, ballRadius);
      
      m_clientBallsView[ballId] = clientBallView;
    }
    
    clientBallView.position = ball.position;
      
  });
  
  m_game.time.advancedTiming = true;
  m_game.time.desiredFps = 30;
  
  
  m_debugTextLabel.setText(
    "lag: " + m_lag
    //"server time: " + serverTime + 
    //" server time difference: " + m_serverTimeDifference// + 
    //" fps:" + m_game.time.fps +
    //" physicsElapsed:" + m_game.time.physicsElapsed + 
    //" elapsed:" + m_game.time.elapsed
    );
  
}



function getMyPlayer () {
  return Players.findOne({_id:m_myPlayerId});
}


function updateMyPlayer () {
  
  let myPlayer = getMyPlayer();
  if(myPlayer == undefined) {
    return;
  }
  let myBall = Balls.findOne({_id:myPlayer.ballId});
  let myCursorBall = Balls.findOne({_id:myPlayer.cursorBallId});
  let myTargetBall = Balls.findOne({_id:myPlayer.targetBallId});

  let targetPosition = myTargetBall.position;
  
  if(myCursorBall == undefined) {
    console.log("no cursor ball");
    return;
  }
  
  let pointer = m_game.input.mousePointer;
  
  if(m_game.input.pointer1.isDown)
  {
    pointer = m_game.input.pointer1;
  }
  let pointerPosition = {x:pointer.worldX, y:pointer.worldY};
  let pointerDown = pointer.isDown;
  
  let inputChanged = false;
  
  if(!Phaser.Point.equals(pointerPosition, myCursorBall.position)) {
    
    Balls.update({_id:myCursorBall._id}, {$set:{
      position:pointerPosition}});
  
    inputChanged = true;
  }
  
  if(pointerDown != myCursorBall.pointerDown) {
    
    Balls.update({_id:myCursorBall._id}, {$set:{
      pointerDown:pointerDown}});
  
    inputChanged = true;
  }
  

  if(inputChanged) {
      if(pointerDown) {
        targetPosition = pointerPosition;
        
        Balls.update({_id:myPlayer.targetBallId}, {$set:{
          position:targetPosition}});
      }
  }



  let ballPos = myBall.position;
  
  
  let ballToTargetVec = Phaser.Point.subtract(
    targetPosition, ballPos);
    
  let ballToTargetMag = ballToTargetVec.getMagnitude();
  
  let ballToTargetDir = Phaser.Point.normalize(
    ballToTargetVec.clone());
    
  let speed = 500;
  let dt = m_game.time.physicsElapsed;
  
  let dispMag = speed*dt;
  if(dispMag > ballToTargetMag) {
    dispMag = ballToTargetMag;
  }
  
  if(dispMag > 0.0001) {
    
    let disp = ballToTargetDir.setMagnitude(dispMag, dispMag);
    
    ballPos = Phaser.Point.add(ballPos, disp);
    
    Balls.update({_id:myPlayer.ballId}, {$set:{
      position:ballPos}});
 
  }
  
  m_game.camera.x = ballPos.x - m_game.width/2;
  m_game.camera.y = ballPos.y - m_game.height/2;
  
}

function getServerTime(){
  return Date.now() + m_serverTimeDifference;
}


function updateOneSec(){

  let myPlayer = getMyPlayer();
  if(myPlayer == undefined) {
    console.log("no player... trying to connect again to get a player...");
    registerClient();
    return;
  }

  Players.update({_id:m_myPlayerId}, {$set:{lastUpdateOneSecTime:getServerTime()}});


  let callTime = Date.now();

  Meteor.call("clientToServerPingOneSec", {playerId:m_myPlayerId}, function(err, response) {
    if(!err) {
      //console.log("got response: ", response);

      let now = Date.now();
      let roundtripTime = now - callTime;
      
      
      m_lag = roundtripTime / 2;
      //console.log("lag:", m_lag);
      
      let serverTime = response.serverTime + m_lag;
      
      let newServerTimeDifference = serverTime - now;
      
      if(m_serverTimeDifference == 0) {
        m_serverTimeDifference = newServerTimeDifference;
      }
      else {
        m_serverTimeDifference = Phaser.Math.linear(
          m_serverTimeDifference, newServerTimeDifference, 0.1);
          
        //console.log(newServerTimeDifference, m_serverTimeDifference);

      }
      
      //console.log("serverTimeDifference:", m_serverTimeDifference);
    }
  });
  
  
 
  
}



  

 