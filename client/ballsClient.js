/*global Phaser*/
/*global Streamy*/
/*global _*/
/*global Players*/
/*global Balls*/
/*global BallStates*/
/*global Worlds*/
/*global Point*/
/*global randomInRange*/

function multiplyByScalar(v, a) {return {x: v.x*a, y:v.y*a};}
function divideByScalar(v, a) {return {x: v.x/a, y:v.y/a};}
function lerp(a, b, t) {return (1-t)*a + t*b;}
// console.log(Vec2.multiplyByScalar({x:3, y:2}, 5));

// function add(a, b) {return {x: a.x+b.x, y: a.y+b.y};}
// function sub(a, b) {return {x: a.x-b.x, y: a.y-b.y};}
// function dot(a, b) {return {x: a.x*b.x + a.y*b.y};}
// function dot(a, b) {return {x: a.x*b.x + a.y*b.y};}



console.log("begin ballsclient.js");

let m_game;

let m_clientBallViews = new Map();

let m_myPlayerId = 0;

let m_debugTextLabel;
let m_logTextLabel;

let m_serverTimeDifference = 0;
let m_serverTimeDifferenceComputed = false;

let m_lag = 0;
let m_averageLag = 0;
let m_smallestLagSinceStart = 10000;

let m_isFirstOneSecPingReturnFromServer = true;
let m_isWaitingForServerPingOneSec = false;
 
let m_phaserCreated = false;

let m_pendingBallStates = [];

// let m_clientTimeOfLastRegisterClient = 0;
// let m_waitingForRegisterClient = false;
//let m_myPlayerInitialized = false;

// function registerClient () {
	
// 	if(m_waitingForRegisterClient && 
// 			m_clientTimeOfLastRegisterClient < Date.now() - 3000) {
		
// 		console.log("still waiting for registerclient. can't call again now");
// 		return;
// 	}
	
// 	m_waitingForRegisterClient = true;
// 	m_clientTimeOfLastRegisterClient = Date.now();
	
// 	console.log('calling register client');
	
// 	Meteor.call('registerClient', {someInitial:"stuff"}, function(err, data) {
		
// 		if(!err){
// 			m_waitingForRegisterClient = false;
			
// 			console.log('registerClient returns:', data);
// 			m_myPlayerId = data.playerId;
			
// 			let myPlayer = Players.findOne({_id:m_myPlayerId});
// 			if(myPlayer == undefined){
// 				console.log("returning from register client and new player not there yet...");
// 			}
// 			else {
// 				console.log("returning from registerclient with player:", myPlayer);
// 			  if(!m_myPlayerInitialized){
// 				  initializeMyPlayer(myPlayer);
// 			  }
// 			}
			
// 			if(!m_phaserCreated){
// 				loadPhaserGame();
// 			}
// 		}
// 		else {
// 			console.log("error in registerClient:", err);
// 		}

// 	});

// }

Meteor.startup(function(){
	console.log("meteor startup");
	console.log("loading phaser...");
	
	$.getScript('//cdn.jsdelivr.net/phaser/2.4.4/phaser.min.js', function() {
		
		let viewWidth = $(window).innerWidth();
		let viewHeight = $(window).innerHeight();

		//console.log("view width and height:", viewWidth, viewHeight);
		m_game = new Phaser.Game(viewWidth, viewHeight, Phaser.AUTO, '', { create: create, update: update });
		console.log("phaser loaded");
		
		// Phaser.Point.prototype.multiplyByScalar = function(v, a, out){
		// 	if(out == undefined) out = new Phaser.Point();
		// 	out.copyFrom(v);
		// 	out.x *= a;
		// 	out.y *= a;
		// }
		
		Point = Phaser.Point;
		
	});
});





function create () {
	
	m_phaserCreated = true;

	
	$(window).resize(function() { resizeGame(); } );

	resizeGame();

	
	m_game.stage.backgroundColor = "0xFFFFFF";

	m_game.stage.disableVisibilityChange = true;

	let x = 10;
	let y = 10;
	m_debugTextLabel = m_game.add.text(x, y += 20, '', { font: "16px Arial", fill: '#000000' });
	m_debugTextLabel.fixedToCamera = true;
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


	setInterval(updateOneSec, 1000);
	setInterval(sendReplicationInfo, 100);
}

function resizeGame(){
	let world = Worlds.findOne(); 
	// if(world != undefined){
	// 	updateGameWorld(world);
	// }

	//console.log("resizing");
	let width = $(window).innerWidth();
	let height = $(window).innerHeight();
	//console.log("width:", width);
	m_game.width = width;
	m_game.height = height;
	
	m_game.camera.width = width;
	m_game.camera.height = height;

	if (m_game.renderType === Phaser.WEBGL) {
		m_game.renderer.resize(width, height);
	}

	if(world != undefined){
		updateGameWorld(world);
	}

}

function updateGameWorld(world){
	m_game.world.setBounds(0, 0, world.width, world.height);
}




Players.find().observe({
	added: function(player){
		console.log("new player", player._id);
		// if(player._id == m_myPlayerId){
		// 	console.log("my player added to players");
		// 	// if(!m_myPlayerInitialized){
		// 	//   initializeMyPlayer(player);
		// 	// }
		// }
		// //log("new player:" + player._id);
	},
	removed: function(player){
		console.log("removed player", player._id);
		//log("player disconnected:" + player._id);
	}
});

// function initializeMyPlayer(player){
// 	console.log("initializeMyPlayer");
	
// 	m_myPlayerInitialized = true;
// }

// Balls.find().observe({

// 	removed: function(ball){
// 		console.log("removed ball", ball);
// 		//log("client disconnected:" + player._id);
// 		if(m_clientBallViews.get(ball._id) != undefined) {
// 			m_clientBallViews.get(ball._id).destroy();
// 			m_clientBallViews.remove(ball._id);
// 		}
// 	}
// });



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
	
	if(m_isFirstOneSecPingReturnFromServer){
		return;
	}
	
//	updateMyPlayer();
	updateMyBallViews();
	
	updateReplicas();

	
	m_game.time.advancedTiming = true;
	m_game.time.desiredFps = 30;
	
	
	m_debugTextLabel.setText(
		"lag: " + m_averageLag.toFixed(0)
		//"server time: " + serverTime + 
		//" server time difference: " + m_serverTimeDifference// + 
		+ "  fps:" + m_game.time.fps
		+ " dt:" + m_game.time.physicsElapsedMS.toFixed(1)
		//+ " elapsed:" + m_game.time.elapsed.toFixed(3)
		);
	
}

function updateReplicas() {
	//return;
	let ballsArray = Balls.find({}).fetch();
	
	for(let ball of ballsArray) {
		
		if(ball.masterId == m_myPlayerId){
			//console.log("skipping");
			continue;
		}
		
		let ballId = ball._id;
		
		// update ball view
		let ballView = m_clientBallViews.get(ballId);
		
		if(ballView == undefined)
		{
			continue;
			//m_clientBallViews.set(ballId, makeBallView(ball));
		}
		
		let realPosition = ball.position;
		let viewPosition = ballView.graphics.position;
		
		let now = getServerTime();
		//let timeSinceLastBallUpdateSec = now - ball.timeStamp;
		let targetTimeDelay = 300;//m_averageLag*2//30 + Math.min(0.3, timeSinceLastBallUpdateSec);

		
		ballView.timeDelay = lerp(ballView.timeDelay, targetTimeDelay, 0.1);

		let desiredBallViewTime = getServerTime() - ballView.timeDelay;
		//let timeFromTimeStampToDesiredViewTime = desiredBallViewTime - ball.timeStamp;
		
		
		let closestSnapshot = null;
		let closestSnaphsotTimeError = 10000;
		
		for(let snapshot of ball.snapshots) {
			let timeError = Math.abs(snapshot.timeStamp - desiredBallViewTime);
			
			if(timeError < closestSnaphsotTimeError) {
				closestSnaphsotTimeError = timeError;
				closestSnapshot = snapshot;
			}
		}
		
		let newViewPosition = realPosition;
		
		if(closestSnapshot != null) {
			newViewPosition = closestSnapshot.position;
		}
		
		
		
		
		// let delayBeforeShouldBeAtBallPosition = ball.timeStamp - desiredBallViewTime;
		
		// if(delayBeforeShouldBeAtBallPosition < 30){
		// 	delayBeforeShouldBeAtBallPosition = 30;
		// }
		
		// let desiredCompleteDisp = Point.subtract(realPosition, viewPosition);
		
		// let desiredVel = divideByScalar(desiredCompleteDisp, delayBeforeShouldBeAtBallPosition);

		// let dt = m_game.time.physicsElapsedMS;
		
		// let desiredDisp = multiplyByScalar(desiredVel, dt);
		
		// let newViewPosition = Point.add(viewPosition, desiredDisp);		
		
		
		
		
		
		
		//console.log(delayBeforeShouldBeAtBallPosition);
// 		let predictedPositionDifference = new Phaser.Point();
// 		predictedPositionDifference.copyFrom(ball.velocity);
// 		predictedPositionDifference.x *= timeFromTimeStampToDesiredViewTime;
// 		predictedPositionDifference.y *= timeFromTimeStampToDesiredViewTime;
// 		//console.log(ball.velocity)
// //			multiplyByScalar(ball.velocity, timeDifference);
			
// 		position = Point.add(position, predictedPositionDifference);
		
		//let desiredTimeDelay = 0;
		
		
		// let timeDelay = desiredTimeDelay;
		// clientBallView.timeDelay = timeDelay;
		
		// if(clientBallView.timeDelay > 0) {
			
		// 	let desiredTimeStamp = getServerTime() - timeDelay;
		// 	let ballStateClosestToDesiredTimeStamp = null;
		// 	let smallestError = 10000;
		// 	let ballStatesArray = BallStates.find({ballId:ball._id}).fetch();
			
		// 	ballStatesArray.forEach(function(ballState){
				
		// 		let timeError = Math.abs(ballState.timeStamp - desiredTimeStamp);        
				
		// 		if(timeError < smallestError){
		// 			smallestError = timeError;
		// 			ballStateClosestToDesiredTimeStamp = ballState;
		// 		}
		// 	});
			
		// 	if(ballStateClosestToDesiredTimeStamp != null){
		// 		position = ballStateClosestToDesiredTimeStamp.position;
		// 	}
			
		// }
		
		if(!Phaser.Point.equals(viewPosition, newViewPosition)){
			ballView.graphics.position = newViewPosition;
		}
	}
}

function getMyPlayer () {
	return Players.findOne({_id:m_myPlayerId});
}



function updateMyBallViews () {
	
	let myPlayer = getMyPlayer();
	if(myPlayer == undefined) {
		return;
	}
	let myBall = Balls.findOne({_id:myPlayer.ballId});
	let myCursorBall = Balls.findOne({_id:myPlayer.cursorBallId});
	let myTargetBall = Balls.findOne({_id:myPlayer.targetBallId});

	if(myBall == undefined ||
			myCursorBall == undefined ||
			myTargetBall == undefined) {
	
		return;
	}

	let myBallView = m_clientBallViews.get(myPlayer.ballId);
	let myCursorBallView = m_clientBallViews.get(myPlayer.cursorBallId);
	let myTargetBallView = m_clientBallViews.get(myPlayer.targetBallId);

	if(myBallView == undefined ||
			myCursorBallView == undefined ||
			myTargetBallView == undefined) {
	
		return;
	}


	let targetBallPosition = myTargetBallView.graphics.position;	
	let cursorBallPosition = myCursorBallView.graphics.position;
	let playerBallPosition = myBallView.graphics.position;
	

	let pointer = m_game.input.mousePointer;
	
	if(m_game.input.pointer1.isDown)
	{
		pointer = m_game.input.pointer1;
	}
	let pointerPosition = {x:pointer.worldX, y:pointer.worldY};
	let pointerDown = pointer.isDown;
	
	let inputChanged = false;
	
	if(!Phaser.Point.equals(pointerPosition, cursorBallPosition)) {

		setBallViewMasterPosition(myCursorBallView, pointerPosition);
		
		inputChanged = true;
	}
	
	if(pointerDown != myCursorBall.pointerDown) {
		
		Balls.update({_id:myCursorBall._id}, {$set:{
			pointerDown:pointerDown}});
	
		inputChanged = true;
	}
	

	if(inputChanged) {
		if(pointerDown) {
			targetBallPosition = pointerPosition;
			setBallViewMasterPosition(myTargetBallView, pointerPosition);
		}
	}




	
	let ballToTargetVec = Phaser.Point.subtract(
		targetBallPosition, playerBallPosition);
		
	let ballToTargetMag = ballToTargetVec.getMagnitude();
	
	let ballToTargetDir = Phaser.Point.normalize(
		ballToTargetVec.clone());
		
	let speed = 300;
	let dt = m_game.time.physicsElapsed;
	
	let dispMag = speed*dt;
	if(dispMag > ballToTargetMag) {
		dispMag = ballToTargetMag;
	}
	
	if(dispMag > 0.0001) {
		
		let disp = ballToTargetDir.setMagnitude(dispMag, dispMag);
		
		playerBallPosition = Phaser.Point.add(playerBallPosition, disp);

		setBallViewMasterPosition(myBallView, playerBallPosition);    
	}
	
	let width = $(window).innerWidth();
	let height = $(window).innerHeight();

	m_game.camera.x = playerBallPosition.x - width/2;
	m_game.camera.y = playerBallPosition.y - height/2;
	
}





function setBallPosition(ball, position) {
	Balls.update({_id:ball._id}, {$set:{
		position:position}});
		
	BallStates.insert({
		ballId:ball._id,
		timeStamp:getServerTime(),
		position:position
	});
}


function setBallViewMasterPosition(ballView, position) {
	//console.log("position:", position);
	ballView.graphics.position = position;
	
	ballView.pendingSnapshots.push(
		makeBallSnapshot(ballView));
		
	// m_pendingBallStates.push({
	// 	ballId:ballView._id,
	// 	timeStamp:getServerTime(),
	// 	position:position
	// });
	
	// Balls.update({_id:ball._id}, {$set:{
	// 	position:position}});
		
	// BallStates.insert({
	// 	ballId:ball._id,
	// 	timeStamp:getServerTime(),
	// 	position:position
	// });
}


function makeBallSnapshot(ballView){
	return {
		position:ballView.graphics.position,
		timeStamp:getServerTime()
	}
}

function getServerTime(){
	return Date.now() + m_serverTimeDifference;
}

function sendReplicationInfo(){
	
	let ballsArray = Balls.find({}).fetch();
	
	let now = getServerTime();
	
	
	for(let ball of ballsArray) {
		//console.log(ball.masterId);
		
		if(ball.masterId != m_myPlayerId){
			//console.log("skipping");
			continue;
		}
		
		let ballId = ball._id;
		
		
		// update ball view
		let ballView = m_clientBallViews.get(ballId);
		
		if(ballView == undefined)
		{
			continue;
			//m_clientBallViews.set(ballId, makeBallView(ball));
		}

		let oldPosition = ball.position;
		let newPosition = ballView.graphics.position;
		let now = getServerTime();
		let bigDt = now - ball.timeStamp
		if(bigDt < 1) bigDt = 1;
		
		let velocity = Phaser.Point.subtract(newPosition, oldPosition);
		velocity.x /= bigDt;
		velocity.y /= bigDt;
		//console.log(velocity)

		if(!Phaser.Point.equals(oldPosition, newPosition) ||
				!Phaser.Point.equals(ball.velocity, velocity) ){
			
			Balls.update({_id:ballId}, {$set:{
		 		position:newPosition,
				velocity:velocity,
				timeStamp:now
			}});

		}


		
		// remove old snapshots
//		let snapshotsToRemove = [];
		for(let snapshot of ball.snapshots) {
			if(snapshot.timeStamp < now - 500) {
	
				Balls.update({_id:ballId}, {
					$pull: {snapshots: {timeStamp:snapshot.timeStamp}}
				});

			}
		}
		
		// if(snapshotsToRemove.length > 0) {
		// 	//console.log("removing snapshot of time", snapshot.timeStamp);
		// 	});
		// }
		


		let pendingSnapshots = ballView.pendingSnapshots;
		
		
		if(pendingSnapshots.length != 0){
			
			//console.log(ball.snapshots.length);

			Balls.update({_id:ballId}, {
				$push: {snapshots: {$each: pendingSnapshots}}
			});
		}
		
		ballView.pendingSnapshots = [];


		// let changedSnapshotList = false;
		// let oldSnapshots = ball.replicationSnapshots;
		
		// let newSnapshots = [];
		
		// for(let oldSnapshot of oldSnapshots){
		// 	if(oldSnapshot.timeStamp > now - 1000){
		// 		newSnapshots.push(oldSnapshot);
		// 	}
		// }
		
		// for(let newSnapshot of ballView.pendingSnapshots){
		// 	newSnapshots.push(newSnapshot);
		// }

		// if(oldSnapshots.length != 0 ||
		// 		newSnapshots.length != 0){
			
		// 	Balls.update({_id:ballId}, {$set:{
		// 		replicationSnapshots:newSnapshots
		// 	}});

		// 	console.log("sending ", newSnapshots)

		// }
		
	
	}


}



function updateOneSec(){

	let myPlayer = getMyPlayer();
	if(myPlayer == undefined &&
		!m_isWaitingForServerPingOneSec &&
		!m_isFirstOneSecPingReturnFromServer) {
		
		console.log("no player...making a new one");
		makeNewPlayer();
		return;
	}

	if(m_serverTimeDifferenceComputed){
		Players.update({_id:m_myPlayerId}, {$set:{lastUpdateOneSecTime:getServerTime()}});
	}

	let callTime = Date.now();
	m_isWaitingForServerPingOneSec = true;
	Meteor.call("clientToServerPingOneSec", {playerId:m_myPlayerId}, function(err, response) {
		if(!err) {
			let serverTime = response.serverTime;
			//console.log("got response: ", response);
			m_isWaitingForServerPingOneSec = false;
			m_lag = (Date.now() - callTime) / 2;
			if(m_averageLag == 0){
				m_averageLag = m_lag;
			}
			else {
				m_averageLag = lerp(m_averageLag, m_lag, 0.1);
			}
			//console.log("lag:", m_lag);
			
			
			if(m_lag < m_smallestLagSinceStart){
				
				let newServerTimeDifference = serverTime + m_lag - Date.now();

				m_smallestLagSinceStart = m_lag;
				m_serverTimeDifference = newServerTimeDifference;
				m_serverTimeDifferenceComputed = true;
				console.log("lag:", m_lag, " serverTimeDifference:", m_serverTimeDifference);
			
				if(m_isFirstOneSecPingReturnFromServer){

					m_isFirstOneSecPingReturnFromServer = false;
					console.log("returning from first onesec ping, making player...");
					makeNewPlayer();
				}
				
			}
			
			// if(m_serverTimeDifference == 0) {
			//   m_serverTimeDifference = newServerTimeDifference;
			// }
			// else {
			//   m_serverTimeDifference = Phaser.Math.linear(
			//     m_serverTimeDifference, newServerTimeDifference, 0.1);
					
			//   //console.log(newServerTimeDifference, m_serverTimeDifference);

			// }
			
			
			//console.log("serverTimeDifference:", m_serverTimeDifference);
		}
	});
	checkBallViewsToRemoveAndAdd();
	
	checkForInitializeWorld();
}

function checkForInitializeWorld(){
	let myPlayer = getMyPlayer();
	if(myPlayer == undefined) return;
	
	if(myPlayer.isHost){
		//console.log("ishost");
		let world = Worlds.findOne();
	
		if(!world.isInitialized){
			
			initializeWorld();
		}	
	}
	
}

function initializeWorld(){
	
	setWorldProperty({isInitialized:true});
	
	makeEnvironment();
}



function makeEnvironment() {
  console.log("making environment");
  
  let world = Worlds.findOne();
  
  let ballCount = 0;
  
  for(let i of ballCount) {
    //console.log(i);
    
    let position = {x:randomInRange(0, world.width), y:randomInRange(0, world.height)};
    let radius = randomInRange(100, 300);
    
    Balls.insert(new Ball({
	    ballType: 'environment',
	    position: position,
	    radius: radius,
	    color: 0x555555
	  }));

  }
}



function setWorldProperty(data){
  let world = Worlds.findOne();

	Worlds.update({_id:world._id}, {$set:data});
}

function checkBallViewsToRemoveAndAdd(){
	
	// check for ballviews that have no balls
	m_clientBallViews.forEach(function(ballView) {
	  ballView.hasBall = false;
	});
	
	let ballsArray = Balls.find({}).fetch();
	ballsArray.forEach(function (ball) {
	
		let ballView = m_clientBallViews.get(ball._id);
		
		if(ballView != undefined){
			ballView.hasBall = true;
		}
		else {
			ballView = makeBallView(ball);
		}
	});
	
	m_clientBallViews.forEach(function(ballView) {
	  if(!ballView.hasBall){
	  	ballView.graphics.destroy();
	  	m_clientBallViews.delete(ballView._id);
	  }
	});

}



function makeBallView(ball) {
	//console.log("making ball", ball.ballType);
	let graphics = m_game.add.graphics(0, 0);
	graphics.lineStyle(2, 0x000000);
	let color = ball.color || 0x000000;
	graphics.beginFill(color);
	let ballRadius = ball.radius;
	 
	graphics.drawCircle(0, 0, ballRadius);

	graphics.position = ball.position;
	
	let clientBallView = {
		_id: ball._id,
		graphics: graphics,
		timeDelay: 0,
		hasBall: true,
		pendingSnapshots: []
	};
	
	m_clientBallViews.set(ball._id, clientBallView);
	
	return clientBallView;
}

function Ball(props) {
	this.ballType = props.ballType;
  this.position = props.position || {x:0, y:0};
  this.velocity = props.velocity || {x:0, y:0};
  this.radius = props.radius || 3;
  this.color = props.color || 0x000000;
	this.timeStamp = props.timeStamp || 0;
	this.masterId = 0;
	this.snapshots = [];
	
	return this;
}


function makeNewPlayer () {
//  console.log("makeNewPlayer");
  let playerBallId = Balls.insert(new Ball({
    ballType: 'player',
    position: {x:100, y:100},
    radius: 60,
    color: Phaser.Color.getRandomColor()
  }));

  let cursorBallId = Balls.insert(new Ball({
    ballType: 'cursor',
    position: {x:200, y:100},
    radius: 10,
    pointerDown: false,
    color: 0x000000
  }));
  
  let targetBallId = Balls.insert(new Ball({
    ballType: 'targetPosition',
    position: {x:200, y:200},
    radius: 3,
    color: 0x000000
  }));
  

  let newPlayer = {
    ballId: playerBallId,
    cursorBallId: cursorBallId,
    targetBallId: targetBallId,
    lastUpdateOneSecTime: getServerTime(),
    isHost: false,
  };
  
  newPlayer._id = Players.insert(newPlayer);
	m_myPlayerId = newPlayer._id;

  Balls.update({_id:playerBallId}, {$set:{masterId:newPlayer._id}});
  Balls.update({_id:cursorBallId}, {$set:{masterId:newPlayer._id}});
  Balls.update({_id:targetBallId}, {$set:{masterId:newPlayer._id}});
	checkBallViewsToRemoveAndAdd();
  
  return newPlayer;
}
