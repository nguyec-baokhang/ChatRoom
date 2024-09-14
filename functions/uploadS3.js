const { GetObjectCommand,S3Client } = require("@aws-sdk/client-s3");
const fs = require('fs');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');



// Create an S3 instance
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Store in .env for security
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: "ap-southeast-2", // Set your desired AWS region
});

const uploadFile = async (file,fname,fileType) => {

  let target ={
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fname,
      Body: Buffer.from(file),
      ContentType: fileType,
      ContentDisposition: 'inline'
  };
  try {
      const parallelUploads3 = new Upload({
        client: s3,
        params: target,
      });
  
      parallelUploads3.on("httpUploadProgress", (progress) => {
        console.log(progress);
        location = parallelUploads3.singleUploadResult.Location;
      });
  
      await parallelUploads3.done();
    } catch (e) {
      console.log(e);
    }

  return location;
}

const retriever = async (fname) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fname,
  };
  const command = new GetObjectCommand(params);
  
  const directory = './storage';
  const filePath = path.join(directory, params.Key);
  const writeStream = fs.createWriteStream(filePath);
  

  try {
    const data = await s3.send(command);
    data.Body.pipe(writeStream);
    return filePath;
  } catch (error) {
    console.log(error);
  }
}



module.exports = {uploadFile, retriever};


