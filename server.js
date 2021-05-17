require('dotenv/config');
const cors = require('cors');
const fs = require('fs');
const url = require('url');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var command = ffmpeg();

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
const { Z_FIXED } = require('zlib');
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
    const clientId = client.id;
    client.on('fileData', (data, fn) => {
        // let fileName = client.id + '.txt'
        let fileName = client.id + '.webm'
        let path = './public/videos/' + fileName;
        let base64 = data.toString("base64");
        fs.appendFile(path, data, null, (err)=>{
            if(err) throw err;
            console.log('appened');
        })
        // chunks.push(data);
    });
    client.on('stop', (data, fn) => {
        let originalFile = './public/videos/' + client.id
        let fileName = client.id + '.mp4'
        const webmPath = './public/videos/' + client.id + ".webm";
        const path = './public/videos/' + fileName;

        var outStream = fs.createWriteStream(path);
        var inStream = fs.createReadStream(webmPath);
        var command = ffmpeg({ source: inStream })
            .on('error', function(err) {
                console.log(err);
                console.log('An error occurred: ' + err.message);
            })
            .on('end', function() {
                console.log('Processing finished !');
                let fileUrl = fullUrl + path.replace('./public/', '');
                //console.log(fullUrl + fileUrl);
                fn({VideoUrl: fileUrl});
                try {
                    fs.unlinkSync(webmPath)
                    //file removed
                  } catch(err) {
                    console.error(err)
                  }
            })
            .saveToFile(path);
        // const newPath = 
        // command
        // .input(webmPath)
        // .output(path)
        // .noAudio()
        // .run()

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
        
        
        
        if(id){
            //save file for the user
            User.findOne({_id: id}).then(function(user){
                user.Files.push(fileName);
                user.save().then(function(newUser){
                    console.log(newUser);
                })
            });
        }

        // const interval = setInterval(function(){
        //     if(fs.existsSync(path)){
        //         let fileUrl = fullUrl + path.replace('./public/', '');
        //         //console.log(fullUrl + fileUrl);
        //         fn({VideoUrl: fileUrl});
        //         clearInterval(interval);
        //     }
        // }, 1000);
        
       
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