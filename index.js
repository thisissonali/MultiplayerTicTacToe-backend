const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const uuid4 = require('uuid4');

const PORT = process.env.PORT || 8000;
const app = express();

let users = 0;
let data = {};
let connectedSocketIds = [];
let newRoom;
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
      users = users - 2;
      return updatedGrid[row * 3];
    }
    if (
      updatedGrid[col] === updatedGrid[col + 3] &&
      updatedGrid[col + 3] === updatedGrid[col + 6] &&
      updatedGrid[col] !== ""
    ) {
      users = users - 2;
      return updatedGrid[col];
    }
    if (diagnoal1) {
      if (
        updatedGrid[0] === updatedGrid[4] &&
        updatedGrid[4] === updatedGrid[8] &&
        updatedGrid[0] !== ""
      ) {
        users = users - 2;
        return updatedGrid[0];
      }
    }
    if (diagnoal2) {
      if (
        updatedGrid[2] === updatedGrid[4] &&
        updatedGrid[4] === updatedGrid[6] &&
        updatedGrid[2] !== ""
      ) {
        users = users - 2;
        return updatedGrid[2];
      }
    }
};

const clickHandler = (index) => {
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
  if (users === 0) connectedSocketIds.splice(0, connectedSocketIds.length);
    users++;
    if (users % 2 !== 0) {
      //odd number of users
      newRoom = uuid4();
      socket.join(newRoom);
      connectedSocketIds.push(socket.id);
    } else {
      connectedSocketIds.push(socket.id);
      socket.join(newRoom);
      users = users - 2;
      data[newRoom] = {gridVal:  Array(9).fill("") , chance: true , connecIdsArr: connectedSocketIds , winner: ''}; 
    }
    data[newRoom] = {gridVal:  Array(9).fill("") , chance: true , connecIdsArr: connectedSocketIds , winner: ''}; 
    io.to(newRoom).emit("data", data, newRoom);
   
  socket.on("click-event", (index) => { 
      if (data[newRoom].chance && socket.id === data[newRoom].connecIdsArr[0]) {
       // X has chance
        clickHandler(index);
     }
     else if (!data[newRoom].chance && socket.id === data[newRoom].connecIdsArr[1]) {
       //0 has chance
       clickHandler(index);
    }  
     io.to(newRoom).emit("data", data, newRoom);
  })
   socket.on("disconnect", () => {
    users--;
    data[newRoom].connecIdsArr = data[newRoom].connecIdsArr.filter(id => id !== socket.id);
    if (data[newRoom].connecIdsArr.length === 0) {
      // Reset game state if both players leave
      data[newRoom].gridVal.fill("");
      data[newRoom].winner = '';
      data[newRoom].chance = true;
    }
  });
});
app.get('/', async (req , res) => {
  res.sendFile(path.resolve(__dirname,  "dist", "index.html"));
});
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
