var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var BasedMongodb = require('../base_mongodb');
var baseMongodb = new BasedMongodb();
var atob = require('atob');

// GCM的部分
var GCM = require('gcm').GCM;

var apiKey = 'AIzaSyBd2ZH22iLFbWjkRbNrWrQn7qpLUvpEPmE';
var gcm = new GCM(apiKey);

var NORMAL = 0;
var SC_CREATE = 1;
var SC_REJECT = 2;
var SC_ACCEPT = 3;

/* GET home page. */
router.all('/RegisterGCM', function(req, res, next) {
	console.log('[RegisterGCM] --- Connection success!!');
	var jRequest = req.body;
	printJson(jRequest)

	var tableName = 'GCMRegister';
	var whereJson = { 'userId':jRequest.userId };			//搜尋條件
	var orderByJson = { };									//排序
	var limitJson = { 'num':2000 };							//數量
	var fieldsJson = { };									//要讀取的欄位

	baseMongodb.find(tableName, whereJson, orderByJson, limitJson, fieldsJson, function(result) {
		console.log('[RegisterGCM] --- findResult : ' + JSON.stringify(result));
		if(result.length > 0) {
			var id = result[0].id;
			baseMongodb.modify(tableName, id, jRequest, function(result) {
				console.log('[regId]--ModifyResult: ' + JSON.stringify(result));
				res.json({'Response': 'success'});
			});
		} else {
			baseMongodb.insert(tableName, jRequest, function(result) {
				console.log('[regId]--InsertResult: ' + JSON.stringify(result));
				res.json({'Response': 'success'});
			});
		}
	});
});

router.all('/Friends/socialClock/create', function(req, res, next) {
	console.log('=====[socialClock/create]=====: ' + 'Connection success!!');
	var jRequest = req.body;
	printJson(jRequest);

	var tableName = 'FriendSocialClock';
	var whereJson = { 'userId':jRequest.userId };			//搜尋條件
	var orderByJson = { };									//排序
	var limitJson = { 'num':2000 };							//數量
	var fieldsJson = { };									//要讀取的欄位

	baseMongodb.insert(tableName, jRequest, function(result) {
		console.log('[socialClock/create] --- InsertResult: ' + JSON.stringify(result));
		var key = result.ops[0].clockId;
		var clock_MongoId = result.ops[0]._id;
		jRequest.mongoID = clock_MongoId;
		console.log('[socialClock/create] --- key : ' + key);
		console.log('[socialClock/create] --- clock_MongoId : ' + clock_MongoId);
		sendBroadcast(SC_CREATEBuilder(key, jRequest.receiverRegId, jRequest.ownerRegId, JSON.stringify(jRequest)));
		res.json({'Response': 'success'});
	});
});

router.all('/Friends/socialClock/reject', function(req, res, next) {
	console.log('[socialClock/reject]: ' + 'Connection success!!');
	var jRequest = req.body;
	console.log('[socialClock/reject] --- jRequest : ' + JSON.stringify(jRequest));

	var clock_MongoId = jRequest.clock_MongoId;
	var serverId = jRequest.uniqueId;

	var tableName = 'FriendSocialClock';
	var whereJson = { 'userId':jRequest.userId };			//搜尋條件
	var orderByJson = { };									//排序
	var limitJson = { 'num':2000 };							//數量
	var fieldsJson = { };									//要讀取的欄位

	baseMongodb.remove(tableName, clock_MongoId, function(result) {
		console.log('[socialClock/reject] --- clock_MongoId : ' + clock_MongoId);
		console.log('[socialClock/reject] --- RemoveResult : ' + JSON.stringify(result));
		console.log('[socialClock/reject] --- serverId : ' + serverId);
		sendBroadcast(SC_REJECTBuilder(serverId, jRequest.receiverRegId, jRequest.ownerRegId, serverId));
		res.json({'Response': 'success'});
	});
});

router.all('/Friends/socialClock/update', function(req, res, next) {
	console.log('[socialClock/update] --- ' + 'Connection success!!');
	var jRequest = req.body;
	console.log('[socialClock/update] --- jRequest : ' + JSON.stringify(jRequest));

	var modifyId = jRequest.mongoID;
	console.log('[socialClock/update] --- modifyId : ' + modifyId);

	var tableName = 'FriendSocialClock';

	baseMongodb.modify(tableName, modifyId, jRequest, function(result) {
		console.log('[socialClock/update]--ModifyResult: ' + JSON.stringify(result));
		res.json({'Response': 'success'});
	});
});

router.all('/Friends/list', function(req, res, next) {
	console.log('Connection success!!');
	var jRequest = req.body;
	printJson(jRequest);

	var tableName = 'Friendlist';
	var whereJson = { 'userId':jRequest.userId };			//搜尋條件
	var orderByJson = { };									//排序
	var limitJson = { 'num':2000 };							//數量
	var fieldsJson = { };	
	baseMongodb.find(tableName, whereJson, orderByJson, limitJson, fieldsJson, function(friendData) {

		if(friendData.length > 0) {
			var friendlist = friendData[0].friendlist;

			getFriendListRegId(friendlist, function() {
				res.json(friendlist);
			});

		} else {
			res.json({'response': 'error'});
		}
	});
});

router.all('/api/record', function(req, res) {
	console.log('[/api/record] --- Connection success!!');

	var jRequest = req.body;
	console.log('[/api/record] --- jRequest : ' + JSON.stringify(jRequest));
	var filename = jRequest.filename;
	var base64_text = jRequest.base64_text;
	var socialClock = JSON.parse(jRequest.socialClock);
	console.log('[/api/record] --- filename : ' + filename);
	// console.log('[/api/record] --- base64_text : ' + base64_text);

	var savepath = path.join('./public/record', filename);
	console.log('[/api/record] --- savepath : ' + savepath);
	var content = atob(base64_text);
    fs.writeFileSync(savepath, content, 'binary');
	
	var modifyId = socialClock.mongoID;
	var tableName = 'FriendSocialClock';

	baseMongodb.modify(tableName, modifyId, jRequest, function(result) {
		console.log('[socialClock/record & update]--ModifyResult: ' + JSON.stringify(result));
		sendBroadcast(SC_ACCEPTBuilder(socialClock.serverId, socialClock.ownerRegId, socialClock.receiverRegId, JSON.stringify(socialClock)));
		res.json({'Response': 'success'});
	});
});


function NORMALBuilder(regId, ownerRegId) {
	return {
		registration_id: regId, // required
		collapse_key: 'GCMBroadcast', 
						'data.case': NORMAL,
						'data.ownerRegId': ownerRegId,
						'data.key2': 'value2'
	};
}

function SC_CREATEBuilder(key, regId, ownerRegId, socialClockString) {
	console.log('[SC_CREATEBuilder] --- regId : ' + regId);
	return {
		registration_id: regId, // required
		collapse_key: 'GCMBroadcast' + key, 
						'data.case': SC_CREATE,
						'data.ownerRegId': ownerRegId,
						'data.socialClock': socialClockString,
		};
}

function SC_REJECTBuilder(key, regId, ownerRegId, serverId) {
	return {
		registration_id: regId, // required
		collapse_key: 'GCMBroadcast' + key, 
						'data.case': SC_REJECT,
						'data.ownerRegId': ownerRegId,
						'data.serverId': serverId
		};
}

function SC_ACCEPTBuilder(key, regId, ownerRegId, socialClockString) {
	return {
		registration_id: regId, // required
		collapse_key: 'GCMBroadcast' + key, 
						'data.case': SC_ACCEPT,
						'data.ownerRegId': ownerRegId,
						'data.socialClock': socialClockString
		};
}

function sendBroadcast(message) {
	// console.log('[sendBroadcast] --- message : ' + JSON.stringify(message));
	gcm.send(message, function(err, messageId){
		if (err) {
			console.log("Something has gone wrong!");
			console.log(err);
		} else {
			console.log("Sent with message ID: ", messageId);
		}
	});
}

function printJson(json) {
	for(var str in json) {
		console.log(str + ':' + json[str]);
	}
}

function getFriendListRegId(friendlist, callback) {
	iterateFriends(friendlist, 0, friendlist.length, callback);
}

function iterateFriends(friendlist, i, length, callback) {
	var eachFriend = friendlist[i];
	
	
	if(i < length) {
		console.log('length: ' + length);
		console.log('eachFriend: ' + JSON.stringify(eachFriend));

		var id = eachFriend.id;
		var tableName = 'GCMRegister';
		var whereJson = { 'userId':id };						//搜尋條件
		var orderByJson = { };									//排序
		var limitJson = { 'num':2000 };							//數量
		var fieldsJson = { };									//要讀取的欄位

		baseMongodb.find(tableName, whereJson, orderByJson, limitJson, fieldsJson, function(result) {
			console.log('iterateEach: ' + JSON.stringify(result));
			
			if(result.length > 0) {		// 代表此人「有」使用本系統
				var regId = result[0].regId;
				eachFriend.regId = regId;
				iterateFriends(friendlist, ++i, length, callback);
			
			} else {		// 代表此人「沒」使用本系統
				callback();
			}
		});
	} else {
		// do nothing and exit iterate
		callback();
	}
}


module.exports = router;
