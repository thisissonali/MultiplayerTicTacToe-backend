const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = 8000;
const app = express();

let users = 0;
let data = {};
let connectedSocketIds = [];

app.use(cors({
  origin: "http://localhost:5173"
}));
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173"
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
        if (data["room1"].gridVal[index]) console.log(data["room1"].gridVal[index]);
        if(data["room1"].winner) console.log(data["room1"].winner);
        console.log("bruh");
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
    console.log("updatedGrid: " + updatedGrid);
    console.log(data["room1"]);
    data["room1"].chance = !data["room1"].chance;
    const tempWinner = gotWinner(index, updatedGrid);
    data["room1"].winner = tempWinner;
    console.log("winner: " + data["room1"].winner);
};

io.on("connection",  (socket) => {
    users++;
    console.log(`User Connected with Id: ${socket.id}`);
    const message = "hey";
    socket.emit("temp", message);
    
    if (users <= 2) {
      socket.join("room1");
      connectedSocketIds.push(socket.id);
    }
    data["room1"] = {gridVal:  Array(9).fill("") , chance: true , connecIdsArr: connectedSocketIds , winner: ''};  //now in data object room1 is the key and empty grid is its value
    io.to("room1").emit("connected-sockets", data["room1"].connecIdsArr);
    console.log(data["room1"]);
   
   socket.on("click-event", (index) => { 
     console.log("hey"); 
     console.log(index);  
      if (data["room1"].chance && socket.id === data["room1"].connecIdsArr[0]) {
       // X has chance
        clickHandler(index);
     }
     else if (!data["room1"].chance && socket.id === data["room1"].connecIdsArr[1]) {
       //0 has chance
       clickHandler(index);
     }
     io.to("room1").emit("room-event", "working");       
     io.to("room1").emit('grid-manip', data["room1"].gridVal);
     io.to("room1").emit("chance-event", data["room1"].chance);
     io.to("room1").emit("winner-event", data["room1"].winner);
     
    })
  //   socket.on("disconnect", () => {
  //   users--;
  //   data["room1"].connecIdsArr = data["room1"].connecIdsArr.filter(id => id !== socket.id);
  //   io.emit("connected-sockets", data["room1"].connecIdsArr);
  //   if (data["room1"].connecIdsArr.length === 0) {
  //     // Reset game state if both players leave
  //     data["room1"].gridVal.fill("");
  //     data["room1"].winner = '';
  //     data["room1"].chance = true;
  //   }
  // });
});


//http
app.get('/', (req, res) => { 
    res.send("Working....")
})
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
