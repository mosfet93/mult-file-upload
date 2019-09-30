var fs_extra = require('fs-extra');
var express = require('express');
var multer = require('multer');
var path = require('path');


var app = express();
app.use(express.static('public'));


var validator = [{
    referer: [
        'http://mywebsite.com/myfilesupload',
        'http://somewebsite.com/upload',
        'http://localhost:3000/'
    ],
    saveto: 'public/userfiles',
    extension: ['xlsx', 'pdf']
}, {
    referer: [
        'test ref 2',
        'http://localhost:3000/'
    ],
    saveto: 'public/exezip',
    extension: ['exe', 'zip']
}];


function authCheckMiddleware(req, res, next) {
    var isAuthed = true;
    if (isAuthed) {
        next();
        return;
    }
    res.status(401).json({
        error: 'Not authed'
    });
}


app.post('/deletefiles', express.json(), function(req, res) {
    try {
        for (var file of req.body) {
            const isNotSpecialDirName = part => !(['', '.', '..'].includes(part));
            var filtered_file = file.split('/').filter(isNotSpecialDirName).join(path.sep);
            filtered_file = filtered_file.split('\\').filter(isNotSpecialDirName).join(path.sep);
            var del_full_path = path.join(__dirname + '/public', filtered_file);
            if (fs_extra.existsSync(del_full_path)) {
                fs_extra.unlinkSync(del_full_path);
                console.log('Deleted file "' + filtered_file + '"');
            }
        }
        res.json({
            status: 'Done'
        });
    } catch {
        res.status(400).json({
            error: 'Bad request'
        });
    }
});


app.post('/uploadfiles', authCheckMiddleware,
    multer({
        limits: {
            files: 5, // number of files
            fileSize: 100 * 1024 * 1024 // 100 MB
        },
        fileFilter: function(req, file, cb) {
            var validatorObject = validator.find(val => val.referer.includes(req.headers.referer) && val.extension.includes(path.extname(file.originalname).substring(1)));
            if (validatorObject) {
                file.__saveto = validatorObject.saveto;
                cb(null, true);
                return;
            }
            cb(null, false);
        },
        storage: multer.diskStorage({
            filename: function(req, file, cb) {
                //cb(null, file.originalname + '-' + Date.now()); // original file name + random date numbers
                cb(null, file.originalname); // if file with this filename already exists it will be overwritten
            },
            destination: function(req, file, cb) {
                var folder = __dirname + '/' + file.__saveto;
                fs_extra.ensureDirSync(folder); // creating dir if not exists
                cb(null, folder);
            }
        })
    }).array('myfiles'),
    function(req, res, next) {
        if (req.files.length > 0) {
            for (var file of req.files) {
                console.log('Saved file "' + file.originalname + '" to "' + file.__saveto + '"');
            }
            res.json({
                status: 'Done'
            });
            return;
        }
        res.status(400).json({
            error: 'Bad request'
        });
    }
);


app.listen(3000);
console.log('Listening on 3000');
