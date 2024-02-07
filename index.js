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

const RAPID_API_KEYS = [
  "6f6bcba81dmsh7bc212731f98f93p1d61ecjsne89a310b4830",
  "ee6c8218aamsh448dfb6a5470e5fp1c9736jsnf52f17230c5b",
  "54fb139661mshb7ee757010901c9p177c1ajsn4a5b60261d0d",
];

function getRandomApiKey() {
  const randomIndex = Math.floor(Math.random() * RAPID_API_KEYS.length);
  return RAPID_API_KEYS[randomIndex];
}

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
      const apiKey = getRandomApiKey();

      const encodedParams = new URLSearchParams();
      encodedParams.set("q", originalText);
      encodedParams.set("target", languageCode);

      const options = {
        method: "POST",
        url: "https://google-translate1.p.rapidapi.com/language/translate/v2",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "Accept-Encoding": "application/gzip",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "google-translate1.p.rapidapi.com",
        },
        data: encodedParams,
      };

      const response = await axios.request(options);
      const translatedText = response.data.data.translations[0].translatedText;

      ctx.telegram.sendMessage(
        ctx.message.chat.id,
        `Translation to ${languageCode.toUpperCase()}: ${translatedText}`,
      );
    }
  } catch (error) {
    console.error("Error processing translation:", error.response?.data || error.message);
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
      const subscription = await Subscription.findOne({ userId });

      if (subscription && subscription.subscribed) {
        const userQuery = ctx.message.text;

        const params = {
          contents: [{
            parts: [{ text: userQuery }],
          }],
        };

        const headers = {
          'Content-Type': 'application/json',
        };

        const response = await axios.post(`${geminiApiUrl}?key=${geminiApiKey}`, params, { headers });

        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
          const textValue = response.data.candidates[0].content.parts[0].text;
          ctx.reply(textValue);
        } else {
          throw new Error('Invalid response from Gemini API');
        }
      } else {
        // pass
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
