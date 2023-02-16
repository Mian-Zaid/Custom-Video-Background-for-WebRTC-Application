'use strict';

const express = require('express');
const app = express();
const server = require('http').Server(app);
const path = require('path');


app.use(express.static(path.join(__dirname, 'client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'client.html'));
});

server.listen(3000, () => {
  console.log('Server is running on port 3000.');
});
