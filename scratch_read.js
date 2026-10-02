const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:\\Users\\skand\\OneDrive\\Desktop\\Projects\\AI Entrepreneurial Startup\\PLAB Test App\\Qpapers Resource\\Papers Set 1\\PLAB MCQ\'s Paper 1.pdf');

pdf(dataBuffer).then(function(data) {
  // Print first 5000 characters
  console.log(data.text.substring(0, 5000));
});
