// Initialize Google Cloud Vision
const vision = require('@google-cloud/vision'); 
const dotenv = require('dotenv').config();

//Credentials Initialization
const credentials = JSON.parse(JSON.stringify({
    
  }));
const config = {
    credentials: {
        private_key: credentials.private_key,
        client_email: credentials.client_email
    }
}

//client will be used to send requests to GCV
const client = new vision.ImageAnnotatorClient(config);

//Text handler
const textHandler = (response_text) => {
    let lines  = [];
    response_text.fullTextAnnotation.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                // Create list to contain the words
                let words = [];
                paragraph.words.forEach(word => {
                    let word_text = word.symbols.map(symbol => symbol.text).join('');
                    words.push(word_text);
                });
                let line = words.join(' ');
                lines.push(line);
            });
        });
    });
    return lines;
}


//Main function
const askGCV = async (file) => {
    //Request the API to detect labels in the image
    const [response_label] = await client.labelDetection({
        image: {
        content: file
        }
    });
    const labels = response_label.labelAnnotations;
    console.log(labels);
    

    //Detect text in image
    const [response_text] = await client.textDetection({
        image: {
        content: file
        }
    });
    const texts = response_text.textAnnotations;
    console.log(response_text);

    //Check if the labels are related to text or typography
    let textRelatedLabels = ['text', 'font', 'line', 'number'];
    let isTextRelated = labels.some(label => textRelatedLabels.includes(label.description.toLowerCase()));
    

    if (labels.length > 0 && texts.length == 0 && !(isTextRelated)){
        console.log('The image contains objects.');
        let analyzedPackage = {
            labels: labels,
        }
        return analyzedPackage;
    }else if (texts.length > 0 && isTextRelated){
        console.log('The image contains text.');
        let lines = textHandler(response_text);
        let analyzedPackage = {
            lines: lines,
        }
        return analyzedPackage;
    }else{
        console.log('The image contains both objects and text.');
        let lines = textHandler(response_text);
        let analyzedPackage = {
            lines: lines,
            labels: labels
        }
        return analyzedPackage; 
    }
    
}

module.exports = {askGCV};