//192.168.18.31
//192.168.31.160
//192.168.100.5
var dgram=require('dgram');
(function(){
	"use strict";

	function Infohash(infohash){
		if(!(this instanceof Infohash)){
			throw new exception("Infohash must new");
		}
		this.data=infohash;
		return this;
	}
	Infohash.prototype.toString=function(){
		var ret='';
		for(var i=0;i<20;i++){
			var n=this.data.readUInt8(i);
			n=n.toString(16);
			if(n.toString().length==1)n='0'+n.toString();
			ret+=n;
		}
		return ret;
	}
	Infohash.createID=function(){
		var ret='';
		var a=[];
		for(var i=0;i<20;i++){
			a.push(Math.floor(Math.random()*255));
		}
		return new Infohash(new Buffer(a));
	}

	var transId=1000;
	var sock=dgram.createSocket('udp4');
	var myversion='jt01';
	var exists_nodes=[
		['50.45.23.25',26847],
		['121.102.46.17',16881],
		['89.115.85.15',61519],
		['88.168.24.1',25153],
		['123.150.156.119',12361],
		['116.9.24.64',6508],
		['125.39.239.120',6006],
		['223.150.126.148',1030],
		['111.12.68.95',30913],
		['77.241.45.85',7239],
	];
	var interactions=[];
	var routeTable=new RouteTable;
	
	var myid=Infohash.createID();
	function exception(msg){
		if(!(this instanceof exception)){
			return new exception(msg);
		}
		this.msg=msg;
		return this;
	}
	function KRPCRequest(ip,port,q,a){
		if(!(this instanceof KRPCRequest)){
			throw new exception("KRPCRequest must new ");
		}
		this.ip=ip;
		this.port=port;
		this.transId=(transId++) + '';
		this.msg=bencode.encode({
			t:this.transId,
			y:'q',
			q:q,
			a:a,
			v:myversion,
		});
		this.createTime=new Date();
		return this;
	}
	KRPCRequest.prototype.send=function(){
		var buf=new Buffer(this.msg);
		sock.send(buf,0,buf.length,this.port,this.ip,function(){
			//console.log('sended request to ['+ip+':'+port+']');
			//console.dir(bencode.decode(msg));
		});
		interactions[this.transId]=this;
	}
	function bencode(){}
	bencode.encode=function(val){
		if(typeof val == 'string'){
			return val.length+':'+val;
		}else if(typeof val == 'number'){
			return 'i'+val+'e';
		}else if(val instanceof Array){
			var ret='l';
			for(var idx in val){
				ret+=bencode.encode(val[idx]);
			}
			ret+='e';
			return ret;
		}else if(val instanceof Object){
			var ret='d';
			for(var idx in val){
				ret+=bencode.encode(idx+'')+bencode.encode(val[idx]);
			}
			ret+='e';
			return ret;
		}
		return 'unknow!';
	}
	
	bencode.decode=function(val){
		if(val.toString('ascii',0,1)=='i'){
			var endofval=val.toString('ascii',1).search('e');
			if(-1==endofval){
				throw exception('not found end of val');
			}
			return {val:Number(val.toString('ascii',1,endofval-1)),offset:endofval+1};
		}else if(val[0]=='e'){
			return {val:null,offset:1};
		}else if(val[0]=='d'){
			var ret={};
			var idx=1;
			var itemname,itemval;
			while(1){
				itemname=bencode.decode(val.substr(idx))
				idx+=itemname.offset;
				if(null==itemname.val){
					break;
				}
				itemval=bencode.decode(val.substr(idx))
				idx+=itemval.offset;
				if(null==itemval.val){
					throw exception('bad directory type!');
				}
				ret[itemname.val]=itemval.val;
			}
			return {val:ret,offset:idx};
		}else if(val[0]=='l'){
			var ret=[];
			var idx=1;
			var item;
			while(1){
				item=bencode.decode(val.substr(idx));
				idx+=item.offset;
				if(null!==item.val){
					ret.push(item.val);
				}else{
					break;
				}
			}
			return {val:ret,offset:idx};
		}else{
			var endoflen=val.search(':');
			if(-1==endoflen){
				throw exception('bad string type!');
			}
			var len=Number(val.substr(0,endoflen));
			if(len+endoflen+1>val.length){
				throw exception('bad string length!['+val+']');
			}
			return {val:val.substr(endoflen+1,len),offset:len+endoflen+1};
		}
		throw exception('bad value type!');

	}
	function peer_node(nodeinfo){
		if(!(this instanceof peer_node)){
			throw new exception('must use new peer_node');
		}
		//this.ip=ip;
		//this.port=port;
		return this;
	}
	peer_node.find_node=function(ip,port,target){
		(new KRPCRequest(ip,port,'find_node',{
			id:myid,
				target:target
		})).send();

	}
	function RouteTable(){
		this.KBuckets=[];
	}
	RouteTable.prototype.add=function(node){
		this.KBuckets.push(node);
	}
	function process_message(msg){
		//console.dir(msg);
		switch(msg.y){
			case 'r':
			return process_response(msg);
			break;
			case 'q':
			return process_request(msg);
			case 'e':
			return process_error(msg);
		}
		throw new exception('bad message type!');
	}
	function str2ip(str){
		var buf=new Buffer(str);

		return buf.readUInt8(0)+'.'+
			buf.readUInt8(1)+'.'+
			buf.readUInt8(2)+'.'+
			buf.readUInt8(3)
		;
	}
	function bin2str(bin){
		var ret='';
		for(var i=0;i<bin.length;i++){
			ret+=bin.readUInt8(i).toString(16)+' ';
		}
		return ret;
	}
	function process_response(response){
		if(undefined === interactions[response.t]){
			throw new exception('unmatched resposne transid:'+response.t);
		}else{
			var req=interactions[response.t];
			delete interactions[response.t];
			console.log(str2ip(response.ip));
			for(var i=0;i<r.nodes.length/8;i++){
				try{
					routeTable.add(new peer_node(r.nodes.substr(i*26,26)));
				}catch(e){

				}
			}
			//console.log('nodes length:'+response.r.nodes.length);
			//console.log(bin2str(response.r.nodes.substr(0,20)));

		}
	}
	function process_request(request){
		
	}
	function process_error(err){
		
	}
	function test(){
		console.log('myid:'+myid.toString());
		//process.exit(0);
		sock.on('message',function(msg,rinfo){
			console.log('socket get message from['+rinfo.address+':'+rinfo.port+']');
			try{
				msg=bencode.decode(msg).val;
				process_message(msg);
			}catch(e){
				console.log(e.msg);
			}
		}).on('listening',function(){
			console.log('socket listening');
		}).on('close',function(){
			console.log('socket closed');
		}).on('error',function(){
			console.log('socket get error');
		}).bind(12500,function(){
			console.log('binded!');
			for(var i in exists_nodes){
				peer_node.find_node(exists_nodes[i][0],exists_nodes[i][1],myid,function(ret){

				});
			}
		});
		
		return;
		console.log(myid);
		return;
		var bc=bencode.encode([55,'b',{aa:'bcd'}]);
		console.log(bc);
		console.log(bencode.decode('4:abcd').val);
		console.log(bencode.decode(bc).val);
	}
	try{
		test();
	}catch(e){
		console.log(e.msg);
	}
})()