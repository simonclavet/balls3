
/*global Streamy*/
/*global Players*/
/*global Balls*/
/*global BallStates*/
/*global Worlds*/

   
  
Meteor.startup(function () {
  console.log("starting server");
  Players.remove({});
  Balls.remove({});
  BallStates.remove({});
  Worlds.remove({});
  

  let world = {width:3000, height: 3000};
  Worlds.insert(world);
  
  
  Meteor.methods({
    

    clientToServerPingOneSec: function(data) {
      
      return {serverTime: Date.now()};
    },
    
    
    
    registerClient: function(data) {
      
      console.log("registerClient");

      var newPlayer = makeNewPlayer();
      let playerId = newPlayer._id;
      
      console.log("new player id:" + playerId);
       
      var dataToReturn = {
        playerId: playerId, 
      };

      return dataToReturn;
    }
  });

  
  Meteor.setInterval(updateOneSec, 1000);
  
  console.log("server started");
});  



function updateOneSec() {
  
  let playerArray = Players.find({}).fetch();
  
  playerArray.forEach(function (player) {
    
    if(player.lastUpdateOneSecTime < Date.now() - 3000){
      removePlayer(player._id);
    }
  });
  
  clearOldStates();
} 

function clearOldStates() {

  let ballStatesArray = BallStates.find({}).fetch();
  
  // console.log("ballStatesCount:", ballStatesArray.length);
  ballStatesArray.forEach(function(ballState){
    
    if(ballState.timeStamp < Date.now() - 3000) {
      
      // console.log("removing ballstate ", ballState);
      BallStates.remove(ballState._id);
    }
  });  
}

function makeNewPlayer () {
//  console.log("makeNewPlayer");
  let newPlayerBall = {
    ballType: 'player',
    position: {x:100, y:100},
    radius: 60
  };
  let playerBallId = Balls.insert(newPlayerBall);

  let newCursorBall = {
    ballType: 'cursor',
    position: {x:200, y:100},
    radius: 10,
    pointerDown: false
  };
  let cursorBallId = Balls.insert(newCursorBall);
  
  let newTargetBall = {
    ballType: 'targetPosition',
    position: {x:200, y:200},
    radius: 3
  };
  let targetBallId = Balls.insert(newTargetBall);
  

  let newPlayer = {
    //socketId: socket.id,
    ballId: playerBallId,
    cursorBallId: cursorBallId,
    targetBallId: targetBallId,
    lastUpdateOneSecTime: Date.now()
  };
  
  newPlayer._id = Players.insert(newPlayer);

  Balls.update({_id:playerBallId}, {$set:{masterId:newPlayer._id}});
  Balls.update({_id:cursorBallId}, {$set:{masterId:newPlayer._id}});
  Balls.update({_id:targetBallId}, {$set:{masterId:newPlayer._id}});


  
  return newPlayer;
}


function removePlayer(playerId){

  var playerToRemove = Players.findOne({_id:playerId});
  console.log("player to remove: ", playerId);
  
  if(playerToRemove != undefined) {
  
    Players.remove(playerId);
    Balls.remove(playerToRemove.ballId);
    Balls.remove(playerToRemove.cursorBallId);
    Balls.remove(playerToRemove.targetBallId);
  }
  
}