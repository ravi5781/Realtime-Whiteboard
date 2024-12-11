const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let activeConnections = 0;

const PORT = process.env.PORT || 3006;

app.use(express.static('docs'));

io.on('connection', (socket) => {
  activeConnections++;
  console.log(`New client connected,Total active connections: ${activeConnections}`);

  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
app.get('/connections', (req, res) => {
  res.send({ activeConnections });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
