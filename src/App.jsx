import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, addDoc, serverTimestamp, startAfter, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { debounce } from 'lodash';
import 'material-symbols/outlined.css';
import './App.css';

const firebaseConfig = {
  apiKey: "AIzaSyAU7b2Apyf3CHOGgM1HQNtbzvRxp6bz0mk",
  authDomain: "chat-95c6e.firebaseapp.com",
  projectId: "chat-95c6e",
  storageBucket: "chat-95c6e.appspot.com",
  messagingSenderId: "1000317158058",
  appId: "1:1000317158058:web:ecef4147a6ad30234a06d3",
  measurementId: "G-RX74G74LCB"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function App() {
  const [user, loading] = useAuthState(auth);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        alert('Please disable your popup blocker to sign in with Google.');
      } else {
        console.error(error);
      }
    }
  };

  return (
    <div className='bg-main h-screen'>
      {loading ? (
        <div>Loading...</div>
      ) : user ? (
        <Chat user={user} />
      ) : (
        <div className='h-full flex items-center justify-center'>
          <button type="button" className='text-white font-semibold bg-button rounded p-4 flex' onClick={handleSignIn}>
            <img src='./g.png' className='h-6 mr-2' alt="Google Logo" />
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

function Chat({ user }) {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const chatRef = collection(firestore, "chat");
  const [messagesData] = useCollectionData(query(chatRef, orderBy('createdAt', 'desc'), limit(10)), { idField: 'id' });
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData);
    }
  }, [messagesData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log("scroll to bottom");
  };

  useEffect(() => {
    scrollToBottom();
  
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const debouncedSendMessage = useRef(
    debounce(async (text) => {
      try {
        await addDoc(chatRef, {
          text: text,
          sender: user.email,
          createdAt: serverTimestamp()
        });
        setMessageText('');
      } catch (error) {
        console.log('Error sending message:', error);
      }
    }, 500)
  ).current;

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim() === '') {
      return;
    }
    debouncedSendMessage(messageText);
    scrollToBottom();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    const scrollTopBefore = container.scrollTop;
  
    if (container.scrollTop === 0) {
      const lastVisibleMessage = messages[messages.length - 1];
      const messagesBeforeLast = await getDocs(
        query(
          collection(firestore, 'chat'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleMessage.createdAt),
          limit(10)
        )
      );
  
      if (!messagesBeforeLast.empty) {
        const newMessages = messagesBeforeLast.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages([...messages, ...newMessages]);
        
        // Adjust scroll position after new messages are added
        container.scrollTop = container.scrollHeight - scrollTopBefore;
      }
    }
  };

  return (
    <div className='h-screen flex flex-col overflow-hidden'>

      <nav className='bg-appbar flex justify-between py-4 px-12 text-white'>
        <div className='flex items-center'>
          <img src={user.photoURL} className='rounded-full h-12 mr-4 border-4 border-white' alt="User Avatar" />
          <h4>{user.email}</h4>
        </div>
        <button onClick={handleSignOut} className='flex items-center'>
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </nav>

      <div
        className='flex-1 customscroll'
        style={{ overflowY: 'auto' }}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages && messages.slice().reverse().map(message => (
          <div key={message.id} className={message.sender === user.email ? 'flex justify-end' : ''}>
            <div className={message.sender === user.email ? 'bg-green-500 max-33 m-1 px-2 rounded-lg message-bubble' : 'bg-gray-300 max-33  m-1 px-2 rounded-lg message-bubble'}>
              <p className='text-white'>{message.text}</p>
              {message.sender !== user.email && <p>Sender: {message.sender}</p>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className='flex justify-center pb-2'>
        <div className="input-container w-1/2 flex items-center justify-center">
          <span className="material-symbols-outlined chat-icon">chat_bubble</span>
          <textarea
            className='bg-button h-16 flex-1 rounded-lg px-14 py-4 text-white resize-none'
            placeholder="Message"
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" onClick={sendMessage} className="bg-button rounded-r-lg px-4 py-2">
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
