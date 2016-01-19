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
function square(a) {return a*a;}
function add(a, b) {return {x: a.x+b.x, y: a.y+b.y};}
function sub(a, b) {return {x: a.x-b.x, y: a.y-b.y};}
function dot(a, b) {return a.x*b.x + a.y*b.y;}
function clone(a) {return {x:a.x, y:a.y};}
function sqDistance(a, b) {return square(a.x - b.x) + square(a.y - b.y);}
function sqLength(a) {return dot(a,a)};
function length(a) {return Math.sqrt(sqLength(a));}
// function getDirAndLength(a) {
// 	let len = length(a);
// 	let dir = {x:1,y:0};
// 	if(len > 0) {
// 		dir = divideByScalar(a, len);
// 	}
// 	return {dir:dir, len:len};
// }
// function dot(a, b) {return {x: a.x*b.x + a.y*b.y};}



console.log("begin ballsclient.js");

let m_game;

let m_clientBallViews = new Map();

let m_myPlayerId = 0;
let m_myPlayer = null;

let m_debugTextLabel;
let m_logTextLabel;

let m_serverTimeDifference = 0;
let m_serverTimeDifferenceComputed = false;

let m_lag = 0;
let m_averageLag = 0;
let m_smallestLagSinceStart = 10000;

let m_phaserCreated = false;

let m_timeOfLastPing = 0;
let m_isWaitingForPingResponse = false;
let m_receivedFirstPingReturnFromServer = false;

let m_playerBallSpeed = 300 / 1000;


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
	
	addButton(x, y += 20, "rebuild environment", function() {
		cleanEnvironment();
		makeEnvironment();
	});
	
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


	//setInterval(updateOneSec, 1000);
	//setInterval(sendReplicationInfo, 100);
	
}


function ping() {

	// if(getServerTime() > m_timeOfLastUpdateOneSec + 1000){
	// 	m_timeOfLastUpdateOneSec = getServerTime();
	// 	updateOneSec();
	// }

	if(m_serverTimeDifferenceComputed){
		Players.update({_id:m_myPlayerId}, {$set:{lastUpdateOneSecTime:getServerTime()}});
	}

	m_myPlayer = getMyPlayer();
	if(m_myPlayer == undefined &&
		m_receivedFirstPingReturnFromServer) {
		
		console.log("no player...making a new one");
		makeNewPlayer();
		return;
	}


	checkBallViewsToRemoveAndAdd();
	
	if(m_myPlayer != undefined &&
			m_myPlayer.isHost) {
				
		doHostStuff();
	}


	sendReplicationInfo();
	
	let pingCallTime = getServerTime();

	m_isWaitingForPingResponse = true;
	m_timeOfLastPing = pingCallTime;
	
	Meteor.call("ping", {}, function(err, response) {
    // console.log("ping response:", response);
    if(err) {
    	console.log(err);
    	return;
    }
		let returnTime = getServerTime();
		
		let tripTime = returnTime - pingCallTime;
		let serverTime = response.serverTime;
		//console.log("got response: ", response);
		m_lag = tripTime / 2;
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
		
			if(!m_receivedFirstPingReturnFromServer){

				m_receivedFirstPingReturnFromServer = true;
				makeNewPlayer();
				console.log("returning from first ping, making player...");
			}
			
		}
			
		// console.log("tripTime:", tripTime);

		m_isWaitingForPingResponse = false;
	});

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
	btn.fixedToCamera = true;
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
	
	// if(m_isWaitingForFirstPingReturnFromServer){
	// 	return;
	// }
	
//	updateMyPlayer();

	m_myPlayer = getMyPlayer();

	updateMyBallViews();
	
	updateReplicas();

	
	m_game.time.advancedTiming = true;
	m_game.time.desiredFps = 30;
	
	let text = "lag: " + m_averageLag.toFixed(0)
		//"server time: " + serverTime + 
		//" server time difference: " + m_serverTimeDifference// + 
		+ "  fps:" + m_game.time.fps
		+ " dt:" + m_game.time.physicsElapsedMS.toFixed(1)
		//+ " elapsed:" + m_game.time.elapsed.toFixed(3) ;

	if(m_myPlayer != undefined &&
			m_myPlayer.isHost) {
				
		text += " host";
	}

	m_debugTextLabel.setText(text);

  let delaySinceLastPing = getServerTime() - m_timeOfLastPing;
	if(!m_isWaitingForPingResponse &&
			delaySinceLastPing > 100) {
		
		// console.log("calling ping after", delaySinceLastPing);
		ping();			
	}
}

function updateReplicas() {
	//return;
	let ballsArray = Balls.find({}).fetch();
	
	let dt = m_game.time.physicsElapsedMS;
	
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
		let targetTimeDelay = m_averageLag*2 + 300//30 + Math.min(0.3, timeSinceLastBallUpdateSec);

		if(ball.futurePredictedSnapshot != null) {
			targetTimeDelay = 100;
		}
		
		ballView.timeDelay = lerp(ballView.timeDelay, targetTimeDelay, 0.1);

		let desiredBallViewTime = getServerTime() - ballView.timeDelay;
		//let timeFromTimeStampToDesiredViewTime = desiredBallViewTime - ball.timeStamp;
		
		
		let closestSnapshot = {timeStamp:ball.timeStamp, position:ball.position};
		let closestSnaphsotTimeError = Math.abs(ball.timeStamp - desiredBallViewTime);
		let foundSnapshot = false;
		for(let snapshot of ball.snapshots) {
			let timeError = Math.abs(snapshot.timeStamp - desiredBallViewTime);
			
			if(timeError < closestSnaphsotTimeError) {
				closestSnaphsotTimeError = timeError;
				closestSnapshot = snapshot;
				foundSnapshot = true;
			}
		}
		
		let targetViewPosition = realPosition;
		
		if(foundSnapshot) {
			targetViewPosition = closestSnapshot.position;
			//console.log("found snapshot with error", closestSnaphsotTimeError, ball.snapshots.length);
		}
		
		if(ball.futurePredictedSnapshot != null) {
			
			if(ball.timeStamp < desiredBallViewTime) {
				
				let futurePosition = ball.futurePredictedSnapshot.position;
				let arrivalTime = ball.futurePredictedSnapshot.timeStamp;
				
				let arrivalDelay = arrivalTime - desiredBallViewTime;
				//console.log(arrivalDelay, arrivalTime);
				
				if(arrivalDelay < dt) arrivalDelay = dt;
				let completeDispToDo = Point.subtract(futurePosition, viewPosition);
				
				let completeDispToDoMag = completeDispToDo.getMagnitude();
				
				let desiredSpeed = completeDispToDoMag/arrivalDelay;
				
				let maximumSpeed = m_playerBallSpeed * 1.5;
				if(desiredSpeed > maximumSpeed) {
					desiredSpeed = maximumSpeed;
				}
				
				let dispThisFrame = completeDispToDo.normalize();
				
				dispThisFrame.setMagnitude(desiredSpeed*dt);
				
				targetViewPosition = Point.add(viewPosition, dispThisFrame);
			}
		}
		
		
		let delayBeforeShouldBeAtBallPosition = dt;//ball.timeStamp - desiredBallViewTime;
		
		// if(delayBeforeShouldBeAtBallPosition < 30){
		// 	delayBeforeShouldBeAtBallPosition = 30;
		// }
		
		let desiredCompleteDisp = Point.subtract(targetViewPosition, viewPosition);
		
		let desiredVel = divideByScalar(desiredCompleteDisp, delayBeforeShouldBeAtBallPosition);

		let desiredDisp = multiplyByScalar(desiredVel, dt);
		
		let newViewPosition = Point.add(viewPosition, desiredDisp);		
		
		if(!Phaser.Point.equals(viewPosition, newViewPosition)){
			ballView.graphics.position = newViewPosition;
		}
	}
}

function getMyPlayer () {
	return Players.findOne({_id:m_myPlayerId});
}



function updateMyBallViews () {
	
	if(m_myPlayer == undefined) {
		return;
	}
	let myBall = Balls.findOne({_id:m_myPlayer.ballId});
	let myCursorBall = Balls.findOne({_id:m_myPlayer.cursorBallId});
	let myTargetBall = Balls.findOne({_id:m_myPlayer.targetBallId});

	if(myBall == undefined ||
			myCursorBall == undefined ||
			myTargetBall == undefined) {
	
		return;
	}

	let myBallView = m_clientBallViews.get(m_myPlayer.ballId);
	let myCursorBallView = m_clientBallViews.get(m_myPlayer.cursorBallId);
	let myTargetBallView = m_clientBallViews.get(m_myPlayer.targetBallId);

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
		
	let dt = m_game.time.physicsElapsedMS;
	
	let dispMag = m_playerBallSpeed*dt;
	if(dispMag > ballToTargetMag) {
		dispMag = ballToTargetMag;
	}
	
	let newPlayerPosition = clone(playerBallPosition);
	
	if(dispMag > 0.0001) {
		
		let disp = ballToTargetDir.setMagnitude(dispMag, dispMag);
		
		newPlayerPosition = Phaser.Point.add(playerBallPosition, disp);
	}
	
	
	if(!Point.equals(playerBallPosition, newPlayerPosition)) {

		
		let ballsArray = Balls.find({}).fetch();

		for(let otherBall of ballsArray) {

			if(otherBall.ballType != 'environment' &&
					otherBall.ballType != 'player') {
			
				continue;
			}
			
			if(otherBall._id == myBallView._id) {
				continue;
			}
		
			let otherBallView = m_clientBallViews.get(otherBall._id);
			if(otherBallView == undefined) {
				continue;
			}
			let otherBallViewPosition = otherBallView.graphics.position;
			
			let sqDist = sqDistance(otherBallViewPosition, newPlayerPosition);
			let maxSqDist = square(otherBall.radius + myBall.radius);
			
			if(sqDist < maxSqDist) {
				//console.log(sqDist, maxSqDist, otherBall.radius, myBall.radius);
				//newPlayerPosition = {x:0, y:300};
				
				let fromOther = sub(newPlayerPosition, otherBallViewPosition);
				let fromOtherMag = Math.sqrt(sqDist);
				
				let maxDist = Math.sqrt(maxSqDist);
				
				let penetrationMag = maxDist - fromOtherMag;
				
				let penetrationDir = {x:1, y:0};
				if(fromOtherMag > 0) {
					penetrationDir = divideByScalar(fromOther, fromOtherMag);
				}
				let colDisp = multiplyByScalar(penetrationDir, penetrationMag);
				
				newPlayerPosition = add(newPlayerPosition, colDisp);
			}
		
		}
		
		
		
	}	
	
	
	
	ballToTargetVec = Phaser.Point.subtract(
		targetBallPosition, newPlayerPosition);
		
	ballToTargetMag = ballToTargetVec.getMagnitude();
	
	if(!Point.equals(playerBallPosition, newPlayerPosition)) {
		setBallViewMasterPosition(myBallView, newPlayerPosition); 
	}
	
	let predictedArrivalTimeDelay = ballToTargetMag / m_playerBallSpeed; 
	
	let timeAtFrameEnd = getServerTime() + dt;
	let predictedArrivalTime = timeAtFrameEnd + predictedArrivalTimeDelay;
	//console.log("arrivalTimeDelay:", predictedArrivalTimeDelay);
	myBallView.futurePredictedSnapshot = {
		position: targetBallPosition,
		timeStamp: predictedArrivalTime
	};
	
	let width = $(window).innerWidth();
	let height = $(window).innerHeight();

	m_game.camera.x = playerBallPosition.x - width/2;
	m_game.camera.y = playerBallPosition.y - height/2;
	
}


function setBallViewMasterPosition(ballView, position) {
	//console.log("position:", position);
	ballView.graphics.position = position;
	
	ballView.pendingSnapshots.push(
		makeBallSnapshot(ballView));
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
		let bigDt = now - ball.timeStamp
		if(bigDt < 1) bigDt = 1;
		
		let velocity = Phaser.Point.subtract(newPosition, oldPosition);
		velocity.x /= bigDt;
		velocity.y /= bigDt;
		//console.log(velocity)

		let changedSomething = false;

		if(!Phaser.Point.equals(oldPosition, newPosition) ||
				!Phaser.Point.equals(ball.velocity, velocity) ){
			changedSomething = true;

		}

		let newSnapshots = [];
		
		for(let snapshot of ball.snapshots) {
			if(snapshot.timeStamp > now - 1000) {
				newSnapshots.push(snapshot);
			}
			else {
				changedSomething = true;
			}
		}

		if(ballView.pendingSnapshots.length != 0){
			for(let snapshot of ballView.pendingSnapshots) {
				newSnapshots.push(snapshot);
				changedSomething = true;
			}
		}
		ballView.pendingSnapshots = [];

		if(changedSomething) {
			//console.log("changedSomething");
			Balls.update({_id:ballId}, {$set:{
		 		position: newPosition,
				velocity: velocity,
				timeStamp: now,
				snapshots: newSnapshots,
				futurePredictedSnapshot: ballView.futurePredictedSnapshot
			}});
		}
	}
}

function doHostStuff() {
	checkForInitializeWorld();
	chooseMasters();
}

function checkForInitializeWorld(){
	let world = Worlds.findOne();

	if(!world.isInitialized){
		
		initializeWorld();
	}	
}

function chooseMasters() {
	
	let ballsArray = Balls.find({}).fetch();
	
	for(let ball of ballsArray) {
		//console.log(ball.masterId);
		
		if(ball.masterId != m_myPlayerId){
		
			
		}
	}
}

function initializeWorld(){
	
	setWorldProperty({isInitialized:true});
	
	makeEnvironment();
}


function cleanEnvironment() {
	let ballsArray = Balls.find({}).fetch();
	
	for(let ball of ballsArray) {
	
		if(ball.ballType == 'environment') {

			Balls.remove({_id:ball._id});
			
		}
		
	}
}


function makeEnvironment() {
  console.log("making environment");
  
  let world = Worlds.findOne();
  
  let ballCount = 50;
  
  for(let i of ballCount) {
    //console.log(i);
    
    let position = {x:randomInRange(0, world.width), y:randomInRange(0, world.height)};
    let radius = randomInRange(50, 150);
    
    Balls.insert(new Ball({
	    ballType: 'environment',
	    position: position,
	    radius: radius,
	    color: 0x555555
	  }));

  }
  
  // Balls.insert(new Ball({
  // 	ballType: 'disk',
  // 	position: {x:300, y:300},
  // 	radius: 30,
  // 	color: 0xffffff
  // }));
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
	 
	graphics.drawCircle(0, 0, ballRadius*2);

	graphics.position = ball.position;
	
	let clientBallView = new BallView({
		_id: ball._id,
		graphics: graphics,
	});
	
	m_clientBallViews.set(ball._id, clientBallView);
	
	return clientBallView;
}


function BallView(props) {
	this._id = props._id || 0;
	this.graphics = props.graphics || null;
	this.timeDelay = props.timeDelay || 0;
	this.hasBall = props.hasBall || true;
	this.pendingSnapshots = props.pendingSnapshots || [];
	this.futurePredictedSnapshot = props.futurePredictedSnapshot || null;
	return this;
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
	this.futurePredictedSnapshot = props.futurePredictedSnapshot || null;
	return this;
}


function makeNewPlayer () {
//  console.log("makeNewPlayer");
  let playerBallId = Balls.insert(new Ball({
    ballType: 'player',
    position: {x:100, y:100},
    radius: 30,
    color: Phaser.Color.getRandomColor()
  }));

  let cursorBallId = Balls.insert(new Ball({
    ballType: 'cursor',
    position: {x:200, y:100},
    radius: 5,
    pointerDown: false,
    color: 0x000000
  }));
  
  let targetBallId = Balls.insert(new Ball({
    ballType: 'targetPosition',
    position: {x:200, y:200},
    radius: 1,
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
