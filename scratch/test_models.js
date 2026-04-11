const models = require('./backend/models');
console.log('Available models:', Object.keys(models));
if (models['users']) {
    console.log('Users model found');
} else {
    console.log('Users model NOT found');
}
