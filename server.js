const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');



const {OpenAI} = require('openai');
const dotenv = require('dotenv').config();
const {askGPT} = require('../ChatRoomNeon/functions/askGPT');
const {askGCV} = require('../ChatRoomNeon/functions/askGCV');
const { uploadFile, retriever, encode } = require('./functions/uploadS3');
const { writeFile } = require('fs');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

PORT = process.env.PORT || 8080

//Setting up Sequelize
const { Sequelize, DataTypes } = require('sequelize');
const essay = require('../ChatRoomNeon/models/essay');
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialectOptions: {
      ssl: {
        require: true,
      },
    },
  });

//Models importing
const Message = require('../ChatRoomNeon/models/Message')(sequelize, DataTypes);
const Url = require('../ChatRoomNeon/models/url')(sequelize, DataTypes);
const Essay = require('../ChatRoomNeon/models/essay')(sequelize, DataTypes);

app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.set('view engine', 'ejs');

io.on('connection',  (socket) => {
    socket.on('join-room', (room) => {
        socket.room = room;
        socket.join(room);
    });

    socket.on('newuser', async function (username){
        socket.to(socket.room).emit('update', {
            username: username,
            text: username + ' has joined the conversation'
        });
        try{
            const chatHistory = await Message.findAll({where: {room: socket.room}});
            const urlHistory = await Url.findAll({where: {room:socket.room}});
            const essayHistory = await Essay.findAll({where: {room:socket.room}});
            // console.log(chatHistory);
            // console.log(urlHistory);
            socket.emit('chatHistory', chatHistory, username, urlHistory, essayHistory);
        }catch(error){
            return;
        }
    });
    socket.on('exituser', function (username){
        socket.to(socket.room).emit('update', {
            username: username,
            text: username + ' has left the conversation'
        });
    });
    socket.on('chat', async function (message){
        // Save the message to Neon(PostgreSQL)
        const message_saved = await Message.create({
            user: message.username,
            room: socket.room,
            text: message.text
        });
        socket.to(socket.room).emit('chat', message);
    });
    socket.on('chatbot', async (message) => {
        console.log(message.text);
        let response = await askGPT(message.text);
        if (response.length > 255){
            const essay_saved = await Essay.create({
                user: message.username,
                room: socket.room,
                essay: response
            });
        }else{
            const message_saved = await Message.create({
                user: message.username,
                room: socket.room,
                text: response
            });
        }
       
        socket.to(socket.room).emit('chatbot', response);
        socket.emit('chatbot-sender', response);
    });
    socket.on('upload', async (whole_file) => {
        let file = whole_file.buffer;
        let fname = whole_file.file_name;
        let uname = whole_file.username;
        let fileType = whole_file.fileType;
        location = await uploadFile(file,fname,fileType);
        // let filePath = await retriever(fname);
        console.log(location);
        const saved_url = await Url.create({
            user: uname,
            filename: fname,
            room: socket.room,
            location: location
        })
        socket.to(socket.room).emit('file-message', {
            location:location,
            username: uname,
            filename: fname
        });
        socket.emit('file-message-sender', location);

        let vision = whole_file.vision;
        if (vision){
            const analyzed = await askGCV(file);
            const lines = analyzed.lines;
            console.log(lines);
            let joined_sentences = lines.join(' ');
            console.log(joined_sentences);
            const message_saved = await Message.create({
                user: 'GCV',
                room: socket.room,
                text: joined_sentences
            });
            socket.to(socket.room).emit('GCV', lines);
            socket.emit('GCV-sender', lines);
            if (joined_sentences.includes('essay')){
                let response = await askGPT(joined_sentences);
                const essay_saved = await Essay.create({
                    user: 'ChatGPT',
                    room: socket.room,
                    essay: response
                });
                socket.to(socket.room).emit('chatbot', response);
                socket.emit('chatbot-sender', response);
            }
        }
    });
    socket.on('download-request', async (fname) => {
        await retriever(fname);
    });
    
});

app.use(express.static(path.join(__dirname+"/public")));
app.use('/storage', express.static(path.join(__dirname, '/storage')));


const start = async () => {
    try {
        server.listen(PORT, () => {
            console.log(`Server has been started on port ${PORT}`)
        })
    } catch (error) {
      console.log(error)  
    }
}
 
start()