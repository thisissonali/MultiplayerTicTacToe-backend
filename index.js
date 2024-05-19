const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const PORT = 8000;
const app = express();

let users = 0;
let data = {};
let connectedSocketIds = [];

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

const clickHandler = (index) => {
   if (data["room1"].gridVal[index] || data["room1"].winner) {
        return;
    }
    let inputValue = data["room1"].chance ? "X" : "0";
    const updatedGrid = data["room1"].gridVal.map((cell, idx) => {
    if (idx === index) {
       data["room1"].gridVal[idx] = inputValue;
       return inputValue;
    }
    return cell;
    });
    data["room1"].chance = !data["room1"].chance;
    const tempWinner = gotWinner(index, updatedGrid);
    data["room1"].winner = tempWinner;
};

io.on("connection",  (socket) => {
    users++;
    
    if (users <= 2) {
      socket.join("room1");
      connectedSocketIds.push(socket.id);
    }
    data["room1"] = {gridVal:  Array(9).fill("") , chance: true , connecIdsArr: connectedSocketIds , winner: ''}; 
    io.to("room1").emit("data", data);
   
  socket.on("click-event", (index) => { 
      if (data["room1"].chance && socket.id === data["room1"].connecIdsArr[0]) {
       // X has chance
        clickHandler(index);
     }
     else if (!data["room1"].chance && socket.id === data["room1"].connecIdsArr[1]) {
       //0 has chance
       clickHandler(index);
     }  
     io.to("room1").emit("data", data);
  })
  
});
app.get('/', async (req , res) => {
  res.sendFile(path.resolve(__dirname,  "dist", "index.html"));
});
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
