
/*global Streamy*/
/*global Players*/
/*global Balls*/
/*global Worlds*/

   
  

let pingCount = 0;

let playerSocketsIndexedOnSocketIds = {};
let playerIdsIndexedOnSocketIds = {};


Meteor.startup(function () {
  console.log("starting server");
  Players.remove({});
  Balls.remove({});
  
  Worlds.remove({});
  
  let world = {width:3000, height: 3000};
  Worlds.insert(world);
  
  
  Meteor.methods({
    
    getServerTime: function() {
      return Date.now();
    },
    
    getServerTimeInfo: function(clientTime) {
      return {serverTime: Date.now()};
    },
    
    
    
    // registerClient: function() {
      
    //   let newPlayer = {
    //     input:{
    //       pointerPosition:{x:0, y:0}
    //     },
    //     state:{
    //       position:{x:0, y:0},
    //       targetPosition:{x:0, y:0}
    //     }
    //   };
      
    //   let newPlayerId = Players.insert(newPlayer);
      
    //   console.log("newPlayer:", newPlayer);
      
    //   let newBall = {};
    //   newBall.ballType = 'player';
    //   newBall.playerId = newPlayerId;
    //   newBall.position = {x:100, y:100};
      
      
    //   let playerBallId = Balls.insert(newBall);
      
    //   var dataToReturn = {playerId: newPlayerId, ballId: playerBallId};
      
    //   Streamy.broadcast("newPlayerConnection", dataToReturn);
      
      
    //   return dataToReturn;
    // }
    
   });
  
  
  
  
  // Streamy.on("goumbaman", function(data) {
  //   console.log("receiving from " + data.playerId + ": " + data.someData);
  // });

  // Streamy.on("helloToServer", function(data) {
  //   console.log("receiving from " + data.playerId + ": " + data.someData);
  // });
  
  // Streamy.onConnect(function(socket){
  //   console.log("onConnect");
    
  //   playerSocketsIndexedOnSocketIds[socket.id] = socket;
    
  //   var newPlayer = makeNewPlayer(socket);
    
  //   console.log("new player id:" + newPlayer._id);
    
  //   playerIdsIndexedOnSocketIds[socket.id] = newPlayer._id;
    
  //   var dataToReturn = {
  //     playerId: newPlayer._id, 
  //     ballId: newPlayer.ballId,
  //     socketId: newPlayer.socketId
  //   };
  //   console.log("playercount:", Object.keys(playerSocketsIndexedOnSocketIds).length);
 
  //   console.log("emiting ", dataToReturn);
  //   Streamy.emit("toClient_Connected", dataToReturn, socket);

  // });
  
  
  
  Streamy.on("toServer_Connect", function(data, socket) {
    console.log("toServer_Connect");
    playerSocketsIndexedOnSocketIds[socket.id] = socket;
    
    var newPlayer = makeNewPlayer(socket);
    
    console.log("new player id:" + newPlayer._id);
    
    playerIdsIndexedOnSocketIds[socket.id] = newPlayer._id;
    
    var dataToReturn = {
      playerId: newPlayer._id, 
      ballId: newPlayer.ballId,
      socketId: newPlayer.socketId
    };
    console.log("playercount:", Object.keys(playerSocketsIndexedOnSocketIds).length);
 
    console.log("emiting ", dataToReturn);
    Streamy.emit("toClient_Connected", dataToReturn, socket);
    
  });
  

  
  Streamy.onDisconnect(function(socket) {
    //console.log("playerDisconnecting socketId:", socket.id);
    
    var playerIdToRemove = playerIdsIndexedOnSocketIds[socket.id];
    //console.log("removing player id: " + playerIdToRemove);
    
    var playerToRemove = Players.findOne({_id:playerIdToRemove});
    console.log("player to remove: ", playerToRemove);
    
    if(playerIdToRemove != undefined) {
    
      delete playerSocketsIndexedOnSocketIds[socket.id];
      delete playerIdsIndexedOnSocketIds[socket.id];
      
      Players.remove(playerIdToRemove);
      Balls.remove(playerToRemove.ballId);
      Balls.remove(playerToRemove.cursorBallId);
      Balls.remove(playerToRemove.targetBallId);
      
      console.log("playercount:", Object.keys(playerIdsIndexedOnSocketIds).length);
      
    }
    
  });

  
  //setInterval(update, 1000);
  
  console.log("server started");
});    




function makeNewPlayer (socket) {
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
    socketId: socket.id,
    ballId: playerBallId,
    cursorBallId: cursorBallId,
    targetBallId: targetBallId
  };
  
  newPlayer._id = Players.insert(newPlayer);
  
  //console.log("newPlayer:", newPlayer);
  
  
  //Players.update({_id:newPlayerId}, {$set:{ballId:playerBallId}});
  

  
  return newPlayer;
}



// function update () {
//   //console.log("updating");
//   pingCount++;
//   //console.log(Date.now());
//   //Streamy.broadcast("pingFromServer", {pingCount:pingCount});
// } 



