var express = require('express');
var router = express.Router();
var DBManager = require("../DatabaseManager");

var db;
/* GET home page. */
router.get('/', function(req, res, next) {
  db = DBManager.getDb();



  res.render('index', { title: 'Express' });
});

module.exports = router;
