# About #
This is the source code to http://www.seddit.com/. It includes an XMPP server that accepts Reddit credentials, and an HTML/JS chat client.

Seddit is a website with chatrooms based around Reddit.com. You sign in with your Reddit identity, and there's a chatroom corresponding to each subreddit.

Moderators of a subreddit are automatically moderators of the corresponding chatroom on Seddit. Users can connect using the web client or their own preferred Jabber/XMPP client, such Pidgin, Adium, or Colloquy.

# Installation #
 1. fork and clone
 2. `cd server`
 3. `ssh-keygen -f id_rsa`
 4. Copy the public key to your clipboard. (On OS X: `cat id_rsa.pub | pbcopy`.)
 5. Open the GitHub admin page for the project. Go to Deploy Deys > Add another deploy key. Paste the key in.
 6. Fix the settings at the top of `fabfile.py`, including the domain, sever username, and GitHub path.
 7. fix the `SECRET_KEY` value to `redditchat/settings.py`
 8. Start an Ubuntu 11.10 server. Make sure your domain and all subdomains are resolving correctly to point to your server.
 9. From your local checkout, make sure you have Fabric and jinja2 installed. (`pip install Fabric jinja2`)
 10. `fab stage_dev bootstrap_everything`

Your server should now be running the site.
