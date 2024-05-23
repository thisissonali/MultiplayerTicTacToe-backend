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
const matchHandler = (socket) => {
   userQueue.push(socket);
     if (userQueue.length >= 2) {

      const socket1 = userQueue.shift();
      const socket2 = userQueue.shift();
      
      newRoom = uuid4();
      socket1.join(newRoom);
      socket2.join(newRoom);
      users[socket1.id] = newRoom;
      users[socket2.id] = newRoom;

      data[newRoom] = { gridVal: Array(9).fill(""), chance: true, connecIdsArr: [socket1.id , socket2.id], winner: '' }; 
      io.to(users[socket.id]).emit("data", data, users[socket.id]);
    }
}
io.on("connection", (socket) => {
  matchHandler(socket);
   
  socket.on("click-event", (index) => {
    if (data[users[socket.id]].chance && socket.id === data[users[socket.id]].connecIdsArr[0]) {
      // X has chance
      clickHandler(index, users[socket.id]);
    }
    else if (!data[users[socket.id]].chance && socket.id === data[users[socket.id]].connecIdsArr[1]) {
      //0 has chance
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
    socket.on("disconnect", async () => {
      const socket1 = socket.id;
      const currentRoom = users[socket.id];
      const socket2 = await io.in(currentRoom).fetchSockets();
      if (socket2 > 0) {
        userQueue.push(socket2[0]);
      }
      if (data[currentRoom]) {
       
        data[currentRoom] = { gridVal: Array(9).fill(""), chance: true, connecIdsArr: [], winner: '' };
        io.to(currentRoom).emit("data", data, currentRoom);
        delete data[currentRoom];
        delete users[socket1];
        delete users[socket2];
          
        }
      
  });
});

app.get('/', async (req , res) => {
  res.sendFile(path.resolve(__dirname,  "dist", "index.html"));
});
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
