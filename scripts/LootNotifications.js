
var ID_MOVE = $.findPacketId("MOVE");
var ID_UPDATE = $.findPacketId("UPDATE");
var ID_NEW_TICK = $.findPacketId("NEW_TICK");
var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");

var player_id = -1;
var playerLocation = null;
var lootbags = {};
var lootbaglocs = {};
var send_notif = true;

var tier = 6; // Minimum tier of items to be notifi'ied

var desirables = [
					0xa20, // Def Pot
					0xa1f, // Att Pot
					0xa21, // Spd Pot
					0xa34, // Vit Pot
					0xa35, // Wis Pot
					0xa4c, // Dex Pot
					0xae9, // Life Pot
					0xaea  // Mana Pot
				];

function onClientPacket(event) {
	var packet = event.getPacket();
	switch (packet.id()) {
		case ID_MOVE: {
			var time = packet.time;
			playerLocation = packet.newPosition;

			if(send_notif){
				for(var bag in lootbags){
					if(lootbaglocs[bag].distanceSquaredTo(playerLocation) <= 200){
						var params = {} 
						toNotif = "";

						for(var idx in lootbags[bag]){
							if(lootbags[bag][idx] != -1){
								var item = $.findItem(lootbags[bag][idx]);
								toNotif += "\\n" + item.id
							}
						}
						if(toNotif == ""){
							continue;
						}
						this.displayNotification(event,bag,0x00ffff,toNotif);						
					}
				}
				send_notif = false;
				$.scheduleEvent(2, "refresh_notif");
			}
			
			break;
		}
	}
}

function onServerPacket(event) {
	var packet = event.getPacket();
	switch (packet.id()) {
		case ID_CREATE_SUCCESS: {
			player_id = packet.objectId;
			break;
		}
		case ID_UPDATE: {
			// New objects
			for (var i = 0; i < packet.newObjs.length; i++) {
				var objectData = packet.newObjs[i];
				if(objectData == null)
					break;

				var type = objectData.objectType;

				if(type == 1280 || type == 1283 || (type >= 1286 && type <= 1296)){
					// new loot bag
					var bagId = objectData.status.objectId;
					lootbags[bagId] = [-1,-1,-1,-1,-1,-1,-1,-1];
					lootbaglocs[bagId] = objectData.status.pos;

					for (var j = 0; j < objectData.status.data.length; j++){
						var statData = objectData.status.data[j];
						if(statData.obf0 >= 8 && statData.obf0 <= 15){
							if(statData.obf1 != -1){
								var item = $.findItem(statData.obf1);

								if(item.tier >= tier || item.bagType == 4 || desirables.indexOf(statData.obf1) != -1){
									lootbags[bagId][statData.obf0 - 8] = statData.obf1;
								}
							}

						}
					}

				}
			}

			// Removed objects
			for (var i = 0; i < packet.drops.length; i++) {
				var droppedObjectId = packet.drops[i];

				if(lootbags[droppedObjectId] != null){
					delete lootbags[droppedObjectId];
					delete lootbaglocs[droppedObjectId];		
				}
			}

			break;
		}
		case ID_NEW_TICK: {
			for (var i = 0; i < packet.statuses.length; i++) {
				var status = packet.statuses[i];

				if(lootbags[status.objectId] != null){
					for (var j = 0; j < status.data.length; j++){
						var statData = status.data[j];
						if(statData.obf0 >= 8 && statData.obf0 <= 15){
							if(statData.obf1 == -1){
								lootbags[status.objectId][statData.obf0 - 8] = statData.obf1;
							}else{
								var item = $.findItem(statData.obf1);

								if(item.tier >= tier || item.bagType == 4 || desirables.indexOf(statData.obf1) != -1){
									lootbags[status.objectId][statData.obf0 - 8] = statData.obf1;
								}
							}

						}
					}
				}
			}
			break;
		}
	}
}

function displayNotification(event, playerObjectId, color, text) {
	var notificationPacket = event.createPacket(ID_NOTIFICATION);
	notificationPacket.objectId = playerObjectId;
	notificationPacket.message = "{\"key\":\"blank\",\"tokens\":{\"data\":\"" + text + "\"}}";
	notificationPacket.color = color;
	event.sendToClient(notificationPacket);
}

function refresh_notif(event) {
	send_notif = true;
}