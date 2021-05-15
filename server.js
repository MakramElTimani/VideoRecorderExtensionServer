require('dotenv/config');
const cors = require('cors');
const fs = require('fs');
const url = require('url');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const express = require('express');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'))


const authRoute = require('./routes/auth');
app.use(authRoute);

//Connect to db
mongoose.connect(
    process.env.MONGODB_CONNECTION_STRING, 
    {  useNewUrlParser: true }, 
    () => console.log('Conntected to db'));


app.get('/', (req, res) => {
    res.send("server is up")
})

const http = require('http');
const server = http.createServer(app);

const io = require('socket.io')(server, {
    cors:{
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.sockets.on('error', err => console.log(err));


const port = process.env.SERVER_PORT || 4000
server.listen(port, () => console.log(`Server is running on port ${port}`));

const fullUrl = `http://localhost:${port}/`;


io.sockets.on("connection", client => {
    let chunks = [];
    let token = client.handshake.headers["auth-token"];
    // console.log("token", token);

    client.on('fileData', (data, fn) => {
        //console.log("file data", data);
        chunks.push(data);
    });
    client.on('stop', (data, fn) => {
        const date = Date.now();
        let fileName = client.id + '.mp4'
        const path = './public/videos/' + fileName;
        let id = "";
        if(token){
            //we need to verify token
            try{
                const verified = jwt.verify(token, process.env.TOKEN_SECRET);
                if(verified && verified._id){
                    id = verified._id;
                }
            }
            catch(err){
            }
        }

        //console.log(path);
        var diskWriterStream = fs.createWriteStream(path);
        chunks.forEach(chunk => {
            diskWriterStream.write(chunk);
        });
        let fileUrl = fullUrl + path.replace('./public/', '');
        //console.log(fullUrl + fileUrl);
        fn({VideoUrl: fileUrl});

        
        if(id){
            //save file for the user
            User.findOne({_id: id}).then(function(user){
                user.Files.push(fileName);
                user.save().then(function(newUser){
                    console.log(newUser);
                })
            });
        }
       
    })
});



app.get('/api/files', async (req, res) => {
    const token = req.headers["auth-token"] ;
    if(!token) return res.send([]);
    
    let resFiles = [];
    try{
         const verified = jwt.verify(token, process.env.TOKEN_SECRET);
         if(verified && verified._id){
             const id = verified._id;
             let dir = './public/videos/';
             const user = await User.findOne({_id: id});
             let count = user.Files.length;
             let index = 0;
             if(count > 3) index = count - 3;
             console.log(count);
             console.log(index);
             let files = user.Files.slice(index, count);
             files.forEach(file => {
                 resFiles.push({
                     name: "file " + index++, 
                     url: fullUrl + dir.replace('./public/', '') + file
                 });
             });
         }
     }
     catch(err){
 
     }
     return res.send(resFiles);
 });