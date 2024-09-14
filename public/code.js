

(function(){
    const app = document.querySelector(".app");
    const socket = io();
    
    let uname;
    let file_send;
    let fname;
    let fileType;

    app.querySelector('.join-screen #join-user').addEventListener('click', () => {
        let username = app.querySelector('.join-screen #username').value;
        let roomChoice = app.querySelector('.join-screen #room-choice').value;
        if(username.length == 0){
            return;
        }
        else if(roomChoice == '-- Select Room --'){
            return;
        }
        socket.emit('join-room', roomChoice);
        socket.emit('newuser', username);
        uname = username;
        app.querySelector('.join-screen').classList.remove('active');
        app.querySelector('.chat-screen').classList.add('active');
    });

    app.querySelector('.chat-screen #send-file').addEventListener('change', (e) => {
        app.querySelector('.messages').classList.add('file-active');
        app.querySelector('.file-container').classList.add('active');
        let file = e.target.files[0];
        fileType = file.type;
        fname = file.name;  
        file_send = file;
        let fileContainer = app.querySelector('.chat-screen .file-container');
        if (!file){
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            let buffer = new Uint8Array(reader.result);
            let el = document.createElement('div');
            el.classList.add('item');
            el.innerHTML = `
                <div class='progress'><i class="fa-solid fa-file"></i></div>
                <div class='filename'>${file.name}</div>
            `;
            fileContainer.appendChild(el);
            // shareFile({
            //     filename: file.name,
            //     total_buffer_size: buffer.length,
            //     buffer_size: 1024
            // }),buffer,el.querySelector('.progress');
        }
        reader.readAsArrayBuffer(file);
    });

    app.querySelector('.chat-screen #send-message').addEventListener('click', () =>{
        let message = app.querySelector('.chat-screen #message-input').value;
        if(message.length == 0){
            return;
        }
                
        socket.emit('chat', {
            username: uname,
            text: message
        });

        if (file_send){
            socket.emit('upload', {
                buffer: file_send,
                file_name: fname,
                username: uname,
                fileType: fileType
            });
        }

        renderMessage('my', {
            username: uname,
            text: message
        });
        
        app.querySelector('.chat-screen #message-input').value = "";
        app.querySelector('.messages').classList.remove('file-active');
        app.querySelector('.file-container').classList.remove('active');
        app.querySelector('.file-container').classList.remove('active');
        app.querySelector('.item').remove();
    });

    app.querySelector('.chat-screen #chatbot-inbound').addEventListener('click', () =>{
        let message = app.querySelector('.chat-screen #message-input').value;
        if(message.length == 0){
            return;
        }
        renderMessage('my', {
            username: uname,
            text: message
        });
        socket.emit('chat', {
            username: uname,
            text: message
        });
        socket.emit('chatbot', {
            username: 'ChatGPT',
            text: message
        });
        app.querySelector('.chat-screen #message-input').value = "";

    });

    app.querySelector('.chat-screen #GCV-inbound').addEventListener('click', () =>{
        if (file_send){
            socket.emit('upload', {
                buffer: file_send,
                file_name: fname,
                username: uname,
                fileType: fileType,
                vision: true
            });
        }
        
        app.querySelector('.chat-screen #message-input').value = "";
        app.querySelector('.messages').classList.remove('file-active');
        app.querySelector('.file-container').classList.remove('active');
        app.querySelector('.file-container').classList.remove('active');
        app.querySelector('.item').remove();
    });


    //Handle file button
    app.querySelector('.chat-screen .type-box #file-input-btn').addEventListener('click', () => {
        app.querySelector('.chat-screen .type-box .send-file').click();
    });
    

    app.querySelector('.chat-screen #exit-chat').addEventListener('click', () => {
        socket.emit('exituser', uname);
        window.location.href = window.location.href;
    });


    socket.on('update', (update) => {
        renderMessage('update', update);
    });

    socket.on('chat', (message) => {
        renderMessage('other', message);
    });

    socket.on('chatbot', (response) => {
        renderMessage('other', {
            username: 'ChatGPT',
            text: response
        });
    });

    socket.on('chatbot-sender', (response) => {
        renderMessage('other', {
            username: 'ChatGPT',
            text: response
        });
    });

    socket.on('GCV', (lines) => {
        renderMessage('other', {
            username: 'GCV',
            text: lines
        });
    });

    socket.on('GCV-sender', (lines) => {
        renderMessage('other', {
            username: 'GCV',
            text: lines
        });
    });

    socket.on('file-message', (file) => {
        renderMessage('file', {
            username: file.username,
            location: file.location
        });
        socket.emit('download-request', file.filename);
    });

    socket.on('file-message-sender', (location) => {
        renderMessage('file-my', {
            location,
        });
    });

    socket.on('chatHistory', (chatHistory, username, urlHistory,essayHistory) => {
        // Merge chatHistory and urlHistory into a single array
        let allHistory = [...chatHistory.map(msg => ({...msg, type: 'text'})), ...urlHistory.map(msg => ({...msg, type: 'file'})), ...essayHistory.map(msg => ({...msg, type: 'essay'}))];
        // Sort allHistory by timestamp
        allHistory.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
   
        // Render messages
        for (let i = 0; i < allHistory.length; i++){
            if ('text' in allHistory[i]) {
                // This is a text message
                if (username != allHistory[i].user){
                    renderMessage('other', {
                        username: allHistory[i].user,
                        text: allHistory[i].text
                    });
                }else{
                    renderMessage('my', {
                        username: allHistory[i].user,
                        text: allHistory[i].text
                    });
                }
            } else if(allHistory[i]['type'] == 'file') {
                // This is a file message
                if (username != allHistory[i].user){
                    renderMessage('file', {
                        username: allHistory[i].user,
                        location: allHistory[i].location
                    });
                }else{
                    renderMessage('file-my', {
                        username: allHistory[i].user,
                        location: allHistory[i].location
                    });
                }
            }else{
                // This is an essay message
                if (username != allHistory[i].user){
                    renderMessage('other', {
                        username: allHistory[i].user,
                        text: allHistory[i].essay
                    });
                }else{
                    renderMessage('my', {
                        username: allHistory[i].user,
                        text: allHistory[i].essay
                    });
                }
            }
        }
    });


    function renderMessage(type,message){
        let messageContainer = app.querySelector('.chat-screen .messages');
        let userList = app.querySelector('.app .offcanvas-body .users');
        if (type == 'my'){
            let el = document.createElement('div');
            el.setAttribute('class', 'message my-message');
            el.innerHTML = `
                <div> 
                    <div class='name'>You</div>
                    <div class='text'>${message.text}</div>
                </div>
            `;
            messageContainer.appendChild(el);
        }
        else if (type == 'other'){
            let el = document.createElement('div');
            el.setAttribute('class', 'message other-message');
            el.innerHTML = `
                <div> 
                    <div class='name'>${message.username}</div>
                    <div class='text'>${message.text}</div>
                </div>
            `;
            messageContainer.appendChild(el);
        }
        else if (type == 'file'){
            let el = document.createElement('div');
            el.setAttribute('class', 'message other-message');
            el.innerHTML = `
                <div> 
                    <div class='name'>${message.username}</div>
                    <iframe class='text' src="${message.location}" frameborder="0"></iframe>
                </div>
            `;
            messageContainer.appendChild(el);
        }
        else if (type == 'file-my'){
            let el = document.createElement('div');
            el.setAttribute('class', 'message my-message');
            el.innerHTML = `
                <div> 
                    <div class='name'>You</div>
                    <iframe class='text' src="${message.location}" frameborder="0"></iframe>
                </div>
            `;
            messageContainer.appendChild(el);
        }
        else if (type == 'update'){
            let el = document.createElement('div');
            el.setAttribute('class', 'update');
            el.textContent = message.text;
            messageContainer.appendChild(el);

            // let userel = document.createElement('div');
            // userel.setAttribute('class', 'user');
            // userel.innerHTML =`
            //     <div class='${message.username}'>${message.username}</div>
            // `;
            // userList.appendChild(userel);
        }

        //Scroll chat to the end 
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight; 
    }

})();


