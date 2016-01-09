var express = require('express');
var router = express.Router();
var fs = require('fs');
var BasedMongodb = require('../base_mongodb');
var baseMongodb = new BasedMongodb();

/* GET home page. */
router.all('/RegisterGCM', function(req, res, next) {
	console.log('Connection success!!');
	var jRequest = req.body;
	
	var tableName = 'GCMRegister';
	var whereJson = { 'userId':jRequest.userId };			//搜尋條件
	var orderByJson = { };									//排序
	var limitJson = { 'num':2000 };							//數量
	var fieldsJson = { };									//要讀取的欄位

	for(var str in jRequest) {
		console.log(str + ':' + jRequest[str]);
	}

	baseMongodb.find(tableName, whereJson, orderByJson, limitJson, fieldsJson, function(result) {

		if(result.length > 0) {
			res.json({'Response': 'isRegisted'});
		} else {
			baseMongodb.insert(tableName, jRequest, function(result) {
				console.log('[regId]--InsertResult: ' + JSON.stringify(result));
				res.json({'Response': 'success'});
			});
		}
	});
});

router.all('/Friends', function(req, res, next) {

});

module.exports = router;
