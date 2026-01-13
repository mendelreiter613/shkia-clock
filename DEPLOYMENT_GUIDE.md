# How to Deploy Your Shkia Clock

Since I cannot automatically create a GitHub repository for you (due to missing authentication), please follow these simple steps to get your **Shkia Clock** online!

## Step 1: Create a GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in.
2. Click the **+** icon in the top right and select **New repository**.
3. Name it `shkia-clock`.
4. Make sure it's **Public** (or Private if you prefer).
5. Click **Create repository**.

## Step 2: Push Your Code
You need to upload the code I wrote to this new repository.
**(Easiest Way: Using GitHub Desktop)**
1. Download and install [GitHub Desktop](https://desktop.github.com/).
2. Open GitHub Desktop and log in.
3. Click **Add an Existing Repository...** (or File > Add Local Repository).
4. Choose the folder where we built the app:  
   `C:\Users\mende\.gemini\antigravity\scratch\shkia-clock`
5. Click **Add Repository**.
6. You will see a button/prompt to **Publish repository**.
7. Publish it to your GitHub account as `shkia-clock`.

**(Alternative: Using Command Line)**
If you are comfortable with the terminal, run these commands in your project folder:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/shkia-clock.git
git branch -M main
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your actual GitHub username)*

## Step 3: Deploy to Railway
1. Go to [Railway.app](https://railway.app/).
2. Log in (you can use your GitHub account).
3. Click **New Project** > **Deploy from GitHub repo**.
4. Select `shkia-clock` from the list.
5. Click **Deploy Now**.
6. Railway will build your site. Once finished, it will give you a URL (e.g., `shkia-clock-production.up.railway.app`).

## Step 4: Enjoy!
Open the URL on your phone or computer. The "Shkia Clock" will ask for your location and start the countdown!

### Features
- **Auto Location**: Takes your device location.
- **Manual Location**: Type a city (e.g., "Jerusalem").
- **Scary Modes**:
  - **< 15 mins**: Red and pulsing.
  - **< 5 mins**: Flashing and shaking (Panic Mode!).
