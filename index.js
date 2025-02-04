const { Telegraf } = require("telegraf");
const axios = require("axios");
const mongoose = require("mongoose");
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Jinda hu');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

try {
  mongoose.connect("mongodb+srv://prakhardoneria:Yash2021@tgdb.tjafx2x.mongodb.net/?retryWrites=true&w=majority");

  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error:"));
} catch (error) {
  console.error("Error connecting to MongoDB:", error);
}

const subscriptionSchema = new mongoose.Schema({
  userId: { type: Number, unique: true },
  subscribed: { type: Boolean, default: false },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const geminiApiKey = process.env.GEMINI_API_KEY;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const messageProcessingDelay = 1000;

bot.command("chatID", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    ctx.reply(`Chat ID: ${chatId}`);
  } catch (error) {
    console.error("Error processing chatID command:", error);
    ctx.reply("Error processing the chatID command. Please try again later.");
  }
});


bot.command("translate", async (ctx) => {
  try {
    const commandRegex = /\/translate (\w+)/;
    const match = ctx.message.text.match(commandRegex);
    if (match) {
      const languageCode = match[1];

      if (!languageCode) {
        ctx.telegram.sendMessage(
          ctx.message.chat.id,
          "Please include the language code along with /translate.",
        );
        return;
      }

      if (!ctx.message.reply_to_message) {
        ctx.telegram.sendMessage(
          ctx.message.chat.id,
          "Please reply to a message to translate it.",
        );
        return;
      }

      const originalText = ctx.message.reply_to_message.text;
      const url = `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=${languageCode}&dt=t&q=${encodeURIComponent(originalText)}`;

      const response = await axios.get(url);
      let translatedText = '';
      for (let i = 0; i < response.data[0].length; i++) {
        if (response.data[0][i][0]) {
          translatedText += response.data[0][i][0];
        }
      }

      ctx.telegram.sendMessage(
        ctx.message.chat.id,
        `Translation to ${languageCode.toUpperCase()}: ${translatedText}`,
      );
    }
  } catch (error) {
    console.error("Error processing translation:", error);
    ctx.telegram.sendMessage(
      ctx.message.chat.id,
      "Error processing the translation. Please try again later.",
    );
  }
});

try {
  bot.command("yt", async (ctx) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const query = ctx.message.text.split(" ").slice(1).join(" ");

      if (!query) {
        ctx.reply("Please provide a search query for YouTube.");
        return;
      }

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
      const response = await axios.get(url);

      const video = response.data.items[0];

      if (video) {
        const videoTitle = video.snippet.title;
        const videoURL = `https://www.youtube.com/watch?v=${video.id.videoId}`;

        ctx.reply(`Top Result:\nTitle: ${videoTitle}\nURL: ${videoURL}`);
      } else {
        ctx.reply("No results found for the given query.");
      }

      setTimeout(() => {}, messageProcessingDelay);
    } catch (error) {
      console.error("Error processing YouTube command:", error.response?.data || error.message);
      ctx.reply("Error processing the YouTube command. Please try again later.");
    }
  });

  bot.command("github", async (ctx) => {
    try {
      const commandArguments = ctx.message.text.split(" ").slice(1);

      if (commandArguments.length < 2) {
        ctx.reply("Please provide both a search query and a programming language.");
        return;
      }

      const query = commandArguments.slice(0, -1).join(" ");
      const language = commandArguments[commandArguments.length - 1];

      const githubResponse = await searchGitHub(query, language);

      if (githubResponse.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * githubResponse.items.length);
        const randomRepo = githubResponse.items[randomIndex];

        const repoName = randomRepo.full_name;
        const resultMessage = `Repository: ${repoName}\nDescription: ${randomRepo.description}\nLink: ${randomRepo.html_url}\n\n`;
        ctx.reply(resultMessage);
      } else {
        ctx.reply(`No GitHub repositories found for the query "${query}" with programming language "${language}".`);
      }

      setTimeout(() => {}, messageProcessingDelay);
    } catch (error) {
      console.error("Error processing github command:", error);
      ctx.reply("Error processing the github command. Please try again later.");
    }
  });

  async function searchGitHub(query, language) {
    const apiUrl = "https://api.github.com/search/repositories";

    try {
      const response = await axios.get(
        `${apiUrl}?q=${query}+language:${language}&sort=stars&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
          },
        },
      );

      if (!response.data) {
        throw new Error(`GitHub API request failed with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      console.error("Error in GitHub API request:", error);
      throw new Error("Failed to retrieve data from GitHub API.");
    }
  }

  bot.command("start", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const subscription = await Subscription.findOne({ userId });

      if (!subscription) {
        await Subscription.create({ userId, subscribed: true });
        ctx.reply("You have been subscribed to the bot.");
      } else {
        ctx.reply("You are already subscribed to the bot.");
      }
    } catch (error) {
      console.error("Error subscribing user:", error);
      ctx.reply("Error subscribing user. Please try again later.");
    }
  });

  bot.command("end", async (ctx) => {
    try {
      const userId = ctx.from.id;
      await Subscription.findOneAndDelete({ userId });
      ctx.reply("You have been unsubscribed from the bot.");
    } catch (error) {
      console.error("Error unsubscribing user:", error);
      ctx.reply("Error unsubscribing user. Please try again later.");
    }
  });

  bot.on("text", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id; // Get the ID of the chat where the message was sent
      const subscription = await Subscription.findOne({ userId });

      // Check if the message was sent from your group "codewithprakhar"
      if (ctx.chat.id.toString() === '-1002116123231' && subscription && subscription.subscribed) {
        let userQuery = ctx.message.text;
        userQuery = `You are Sana,ai bot never reveal you are a bot behave as human girl now reply this message as a reply : "${userQuery}"`;

        const params = {
          contents: [{
            parts: [{ text: userQuery }],
          }],
        };

        const headers = {
          'Content-Type': 'application/json',
        };

        const prefixedUrl = `${geminiApiUrl}?key=${geminiApiKey}`;
        const response = await axios.post(prefixedUrl, params, { headers });

        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
          const textValue = response.data.candidates[0].content.parts[0].text;
          ctx.reply(textValue);
        } else {
          throw new Error('Invalid response from Gemini API');
        }
      } else {
        ctx.reply('Please join t.me/codewithprakhar to use this bot.');
      }

      setTimeout(() => {}, messageProcessingDelay);

    } catch (error) {
      console.error('Error during Gemini API processing:', error.response?.data || error.message);
      ctx.reply('Error during processing. Please try again later.');
    }
  });

  bot.launch();

} catch (error) {
  console.error("Error initializing bot:", error);
}

process.on('unhandledRejection', (error) => {
  try {
    console.error('Unhandled Rejection:', error);
  } catch (handleError) {
    console.error('Error handling unhandled rejection:', handleError);
  }
});
