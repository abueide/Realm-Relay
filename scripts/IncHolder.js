var ID_CREATE_SUCCESS = $.findPacketId("CREATE_SUCCESS");
var ID_NOTIFICATION = $.findPacketId("NOTIFICATION");
var ID_PLAYER_TEXT = $.findPacketId("PLAYERTEXT");
var ID_UPDATE = $.findPacketId("UPDATE");

var helloPacket = null;

var player_id = null;
var inc_holders = {};

function onClientPacket(event) {
	var packet = event.getPacket();
	switch (packet.id()) {
		case ID_PLAYER_TEXT: {
			var text = packet.text;
			if(text == "/wc"){
				event.cancel();

				var toPrint = "Inc Holders:\\n";

				for (var id in inc_holders){
					if (!inc_holders.hasOwnProperty(id))
						continue;

					toPrint += inc_holders[id] + "\\n"
				}

				this.displayNotification(event, player_id, 0xFF8000, toPrint);
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
			var boss = this;

			// New objects
			for (var i = 0; i < packet.newObjs.length; i++) {
				var objectData = packet.newObjs[i];
				if(objectData == null)
					continue;

				var type = objectData.objectType;
				if(type == 768 || type == 775 || type == 782 || type == 784 || (type >= 797 && type <= 806)){ // player classes
					var inc = false;

					for (var j = 0; j < objectData.status.data.length; j++) {
						var statData = objectData.status.data[j];
						if(statData != null && ((statData.obf0 >= 8 && statData.obf0 <= 19) || (statData.obf0 >= 71 && statData.obf0 <= 78))){
							if(statData.obf1 == 1826) { //1826 - Value for incantation
								inc = true;
							}
						}

						if(inc && statData.obf0 == 31){
							inc_holders[objectData.status.objectId] = statData.obf2;

							boss.displayNotification(event, player_id, 0xFF8000, statData.obf2 + " has an inc!");
							break;
						}
					}
				}
			}

			// Removed objects
			for (var i = 0; i < packet.drops.length; i++) {
				var droppedObjectId = packet.drops[i];

				if(inc_holders[droppedObjectId] != null){
					boss.displayNotification(event, player_id, 0xFF8000, inc_holders[droppedObjectId] + " has left.");	
					delete inc_holders[droppedObjectId];			
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