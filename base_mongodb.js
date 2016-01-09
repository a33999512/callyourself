/**
 * @type class BaseMongodb
 * @author danhuang
 * @time 2012-12-26
 * @desc desc base_mongodb.js
 */
 var Util = require('./util')
   , mongodb = require('mongodb')
   , db;
  var dbClient;
 module.exports = function(){
	var self = this;
	/**
	 *
	 * 根據主鍵id值查詢資料庫的一條記錄
	 * @param tableName string 
	 * @param id number
	 * @param callback function
	 * @return null
	 */
	this.findOneById = function(tableName, id, callback){
		connection(function(db){
			db.collection(tableName, function (err, collection) {
				var mongoId = new mongodb.ObjectID(id);
				var cursor = collection.find({'_id':mongoId});
				cursor.toArray(function(err, docs) {
					if(err){
						callback(false);
					} else {
						var row = {};
						if(docs){
							row = self.filterSelfRow(docs.shift());
						} 
						callback(row);
					}
				});
				cursor.rewind();
			});
		});
	};
	
	/**
	 *
	 * @desc 向資料庫插入資料
	 * @param tableName string 
	 * @param rowInfo json 
	 * @param callback function
	 * @return null
	 */
	this.insert = function(tableName, rowInfo, callback){
		connection(function(db){
			db.collection(tableName, function (err, collection) {
				collection.insert(rowInfo, function(err, objects){
					if (err) {
						console.log('false');
						console.log(err);
						callback(false);
					} else {
						 console.log('success')
						callback(objects);
					}
				});
			});
		});
	};
	
	this.modify = function(tableName, id, rowInfo, callback){
		connection(function(db){
			db.collection(tableName, function (err, collection) {
				var mongoId = new mongodb.ObjectID(id);
				collection.update({'_id':mongoId}, rowInfo,{safe:true}, function(err){
					if (err) {
						callback(false);
					} else {
						callback(true);
					}
				});
			});
		});
	};
	
	/**
	 *
	 * @desc 移除資料庫的一條資料
	 * @param tableName string 
	 * @param id number 
	 * @param rowInfo json 
	 * @param callback function
	 * @return null
	 */
	this.remove = function(tableName, id, callback){
		connection(function(db){
			db.collection(tableName, function (err, collection) {
				var mongoId = new mongodb.ObjectID(id);
				collection.remove({'_id':mongoId}, function(err){
					if (err) {
						callback(false);
					} else {
						callback(true);
					}
				});
			});
		});
	};
	//this.find = function(tableName, whereJson,  fieldsJson, callback){
	this.find = function(tableName, whereJson, orderByJson, limitJson, fieldsJson, callback){
		//console.log( tableName+":"+JSON.stringify(whereJson)+":"+JSON.stringify(orderByJson)+":"+JSON.stringify(limitJson)+":"+JSON.stringify(fieldsJson));
		
		if(whereJson['id']){
			whereJson['_id'] = new mongodb.ObjectID(whereJson['id']);
			delete whereJson['id'];
		}
		var retArr = [];
		connection(function(db){
		//console.log(db);
			db.collection(tableName, function (err, collection) {
				var cursor = collection.find(whereJson, fieldsJson);
				var cursor = collection.find(whereJson);
				if(orderByJson){
					cursor.sort(orderByJson);
				}
				if(limitJson){
					var skip = limitJson['skip'] ? limitJson['skip'] : 0;
					cursor.limit(limitJson['num']).skip(skip);
				}
				cursor.toArray(function(err, docs) {
					if(err){
						callback(false);
					} else {
						if(docs){
							for(var i=0; i<docs.length; i++){
								row = self.filterSelfRow(docs[i]);
								retArr.push(row);
							}
						} 
						callback(retArr);
					}
				});
				cursor.rewind();
			});
		});
	};
	
	this.filterSelfRow = function(rowInfo){
		if(rowInfo['_id']){
			rowInfo['id'] = rowInfo['_id'];
			delete rowInfo['_id'];
		}
		return rowInfo;
	};

	this.disconnection=function(module){
		dbClient.close();
		console.log(module + ': disconnection');
	}
	
	
	/**
	 *
	 * 資料庫連線建構函數
	 */
	function connection(callback){
		//console.log("1"+":"+db);
		if(!db){
			  var dbConfig = Util.get('config.json', 'db');
			/* 取得mysql組態訊息 */
			
			var host = dbConfig['host']
			  , port = dbConfig['port']
			  , dbName = dbConfig['db_name']
			  , server = new mongodb.Server(host, port);
			  dbClient = new mongodb.Db(dbName, server,{safe:false});
			dbClient.open(function (err, dbObject) {
				db = dbObject;
				callback(dbObject);
				console.log('connection success');
				
			});
			//dbClient.close;
		} else {
			callback(db);
		}
	}
 }