const { Telegraf, Markup } = require("telegraf");
const { WebSocket } = require("ws");
const fetch = require("node-fetch");
const timestampToDate = require("timestamp-to-date");
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN_MAIN);

const contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const mainChatId = "-1002253121294";
const token = process.env.MEMPOOL_TOKEN;

const padWallet = {
   address: "TAVU6HYWn5Rh85DqEcXTRLLXUt8eA34hCo",
   deposit: {
      id: "",
      timeStamp: "",
      infoText: "прокладки",
      subFile: "padsubscribers.json",
      minAmount: 0,
      showFrom: false,
   },
   out: {
      id: "",
      timeStamp: "",
      infoText: "прокладки",
      subFile: "padoutsubscribers.json",
   },
   signs: "",
};

(function mempoolSub(wallet) {
   const bitqueryConnection = new WebSocket(
      "wss://streaming.bitquery.io/eap?token=" + token,
      ["graphql-ws"]
   );
   bitqueryConnection.on("open", () => {
      console.log("Connected to Bitquery.");
      const initMessage = JSON.stringify({ type: "connection_init" });
      bitqueryConnection.send(initMessage);
   });
   bitqueryConnection.on("message", async (data) => {
      const response = JSON.parse(data);
      if (response.type === "connection_ack") {
         console.log("Connection acknowledged by server.");
         const subscriptionMessage = JSON.stringify({
            type: "start",
            id: "1",
            payload: {
               query: `
				subscription {
					Tron(mempool: true) {
						Transfers {
							Contract {
							Address
							}
							Transfer {
							Sender
							Receiver
							Amount
							}
						}
					}
				}
				`,
            },
         });
         bitqueryConnection.send(subscriptionMessage);
         console.log("Subscription message sent.");
         //add stop logic
         // setTimeout(() => {
         //    const stopMessage = JSON.stringify({ type: "stop", id: "1" });
         //    bitqueryConnection.send(stopMessage);
         //    console.log("Stop message sent after 10 seconds.");

         //    setTimeout(() => {
         //       console.log("Closing WebSocket connection.");
         //       bitqueryConnection.close();
         //    }, 1000);
         // }, 300);
      }
      // Handle received data
      if (response.type === "data") {
         const transers = response.payload.data.Tron.Transfers;
         for (let key in transers) {
            if (transers[key].Contract.Address === contract_address && transers[key].Transfer.Receiver === wallet.address ) {
					await bot.telegram.sendMessage(
						mainChatId,
						`${wallet.signs && wallet.signs + "\n"}Пополнение ${
							wallet.deposit.infoText
						}\nСумма: ${
							stringValue(transers[key].Transfer.Amount.split(".")[0])
						} USDT`
					);
				}
         }
      }
      // Handle keep-alive messages (ka)
      if (response.type === "ka") {
         console.log("Keep-alive message received.");
         // No action required; just acknowledgment that the connection is alive.
      }
      if (response.type === "error") {
         console.error("Error message received:", response.payload.errors);
      }
   });
   bitqueryConnection.on("close", () => {
      console.log("Disconnected from Bitquery.");
   });
   bitqueryConnection.on("error", (error) => {
      console.error("WebSocket Error:", error);
   });
})(padWallet);

bot.on("message", async (ctx) => {
   if (!ctx.message.text) return;
   if (ctx.message.text.trim() === "/vbnm") {
      await ctx.reply("!");
   }
});
bot.launch();

function editedValue(value, decimalPlaces = 0) {
   return (value / 1000000).toFixed(decimalPlaces);
}

function stringValue(value) {
   return value.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
