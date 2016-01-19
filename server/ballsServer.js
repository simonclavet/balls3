
/*global Players*/
/*global Balls*/
/*global BallStates*/
/*global Worlds*/
/*global randomInRange*/
/*global randomColor*/


Meteor.startup(function () {
  console.log("starting server");
  Players.remove({});
  Balls.remove({});
  BallStates.remove({});
  Worlds.remove({});
  

  let world = {
    width:3000, 
    height: 3000, 
    isInitialized: false};
    
  Worlds.insert(world);
  
  
  
  
  
  Meteor.setInterval(updateOneSec, 1000);
  
  console.log("server started");

  
  
  
  
  
  Meteor.methods({
    
    clientToServerPingOneSec: function(data) {
      
      return {serverTime: Date.now()};
    },
    
    ping: function(data) {
      // console.log("ping");
      return {serverTime: Date.now()};
    },
    
    // registerClient: function(data) {
      
    //   console.log("registerClient");

    //   var newPlayer = makeNewPlayer();
    //   let playerId = newPlayer._id;
      
    //   console.log("new player id:" + playerId);
       
    //   var dataToReturn = {
    //     playerId: playerId, 
    //   };

    //   return dataToReturn;
    // }
  });
});  



function updateOneSec() {
  
  let playerArray = Players.find({}).fetch();
  let removedAPlayer = false;
  for(let player of playerArray) {
    if(player.lastUpdateOneSecTime < Date.now() - 5000){
      removePlayer(player._id);
      removedAPlayer = true;
    }
  }

  if(removedAPlayer){
    playerArray = Players.find({}).fetch();
  }
  
  
  let hasHost = false;
  for(let player of playerArray) {
    if(player.isHost) {
      hasHost = true;
      break;
    }
  }
  
  if(!hasHost) {
  
    for(let player of playerArray) {
       
      if(!hasHost){
        player.isHost = true;
        console.log("choosing host");
        Players.update({_id:player._id}, {$set:{isHost:player.isHost}});

        break;
      }
    }
  }
} 

// function clearOldStates() {

//   let ballStatesArray = BallStates.find({}).fetch();
  
//   // console.log("ballStatesCount:", ballStatesArray.length);
//   ballStatesArray.forEach(function(ballState){
    
//     if(ballState.timeStamp < Date.now() - 1000) {
      
//       // console.log("removing ballstate ", ballState);
//       BallStates.remove(ballState._id);
//     }
//   });  
// }

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