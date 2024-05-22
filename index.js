const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const uuid4 = require('uuid4');

const PORT = process.env.PORT || 8000;
const app = express();

let data = {}; // will have room to user mapping
let users = {}; // will have user to room mapping
let connectedSocketIds = [];
let newRoom;
let userQueue = [];

app.use(cors({
  origin: "*"
}));
app.use(express.static('dist'));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
}
});

const gotWinner = (index, updatedGrid) => {
    let diagnoal1, diagnoal2;
    const row = Math.floor(index / 3);
    const col = index % 3;
    if (index === 0 || index === 4 || index === 8) {
      diagnoal1 = true;
    }
    if (index === 2 || index === 4 || index === 6) {
      diagnoal2 = true;
    }
    if (
      updatedGrid[row * 3] === updatedGrid[row * 3 + 1] &&
      updatedGrid[row * 3 + 1] === updatedGrid[row * 3 + 2] &&
      updatedGrid[row * 3] !== ""
    ) {
      return updatedGrid[row * 3];
    }
    if (
      updatedGrid[col] === updatedGrid[col + 3] &&
      updatedGrid[col + 3] === updatedGrid[col + 6] &&
      updatedGrid[col] !== ""
    ) {
      return updatedGrid[col];
    }
    if (diagnoal1) {
      if (
        updatedGrid[0] === updatedGrid[4] &&
        updatedGrid[4] === updatedGrid[8] &&
        updatedGrid[0] !== ""
      ) {
        return updatedGrid[0];
      }
    }
    if (diagnoal2) {
      if (
        updatedGrid[2] === updatedGrid[4] &&
        updatedGrid[4] === updatedGrid[6] &&
        updatedGrid[2] !== ""
      ) {
        return updatedGrid[2];
      }
    }
};

const clickHandler = (index, newRoom) => {
  console.log(newRoom);
  console.log(data[newRoom]);
   if (data[newRoom].gridVal[index] || data[newRoom].winner) {
        return;
    }
    let inputValue = data[newRoom].chance ? "X" : "0";
    const updatedGrid = data[newRoom].gridVal.map((cell, idx) => {
    if (idx === index) {
       data[newRoom].gridVal[idx] = inputValue;
       return inputValue;
    }
    return cell;
    });
    data[newRoom].chance = !data[newRoom].chance;
    const tempWinner = gotWinner(index, updatedGrid);
    data[newRoom].winner = tempWinner;
};

io.on("connection", (socket) => {
     userQueue.push(socket);
    console.log(userQueue.length); 
    if (userQueue.length >= 2) {
      const socket1 = userQueue.shift();
      const socket2 = userQueue.shift();
      console.log("hey");
      newRoom = uuid4();
      socket1.join(newRoom);
      socket2.join(newRoom);
      users[socket1.id] = newRoom;
      users[socket2.id] = newRoom;

      connectedSocketIds.push(socket1.id);
      connectedSocketIds.push(socket2.id);
      data[newRoom] = { gridVal: Array(9).fill(""), chance: true, connecIdsArr: connectedSocketIds, winner: '' }; 
      console.log(connectedSocketIds);
      io.to(users[socket.id]).emit("data", data, users[socket.id]);
    } else {
      connectedSocketIds = [];
      console.log(connectedSocketIds);
    }
   
  socket.on("click-event", (index) => {
    console.log(data[users[socket.id]].chance);
    console.log(data[users[socket.id]]);
    console.log(socket.id);
    console.log(data[users[socket.id]].connecIdsArr[0]);
    if (data[users[socket.id]].chance && socket.id === data[users[socket.id]].connecIdsArr[0]) {
      // X has chance
      console.log('x clickhandler worked');
      console.log(users);
      console.log(users[socket.id]);
      clickHandler(index, users[socket.id]);
    }
    else if (!data[users[socket.id]].chance && socket.id === data[users[socket.id]].connecIdsArr[1]) {
      //0 has chance
      console.log('0 clickhandler worked');
      console.log(users);
      console.log(users[socket.id]);
      clickHandler(index, users[socket.id]);
    }
    io.to(users[socket.id]).emit("data", data, users[socket.id]);
  });
  socket.on("request-new-room", (userId) => {
    const currentRoom = users[userId];
    const newRoom = uuid4();
    data[newRoom] = { gridVal: Array(9).fill(""), chance: true, connecIdsArr: [], winner: '' };

    const userIndex = data[currentRoom].connecIdsArr.indexOf(userId);
    if (userIndex >= 0) {
      data[newRoom].connecIdsArr.push(userId);
      socket.join(newRoom);
      users[userId] = newRoom;

      if (data[currentRoom].connecIdsArr.length === 2) {
        const otherUserId = data[currentRoom].connecIdsArr[1 - userIndex];
        data[newRoom].connecIdsArr.push(otherUserId);
        io.sockets.sockets.get(otherUserId).leave(currentRoom);
        io.sockets.sockets.get(otherUserId).join(newRoom);
        users[otherUserId] = newRoom;
      }
    }

    io.to(newRoom).emit("new-room", data[newRoom]);
  });
    socket.on("disconnect", () => {
    const room = users[socket.id];
    if (room && data[room]) {
      data[room].connecIdsArr = data[room].connecIdsArr.filter(id => id !== socket.id);

      if (data[room].connecIdsArr.length === 0) {
        delete data[room];
      }
    }
  });
});
app.get('/', async (req , res) => {
  res.sendFile(path.resolve(__dirname,  "dist", "index.html"));
});
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
