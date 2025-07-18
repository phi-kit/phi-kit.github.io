import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { PlusCircle, MinusCircle, Trash2, Home, Box, Briefcase, Car, Utensils, Lightbulb } from 'lucide-react';

// Firebase configuration and initialization (global variables provided by the environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Main App Component
const App = () => {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newItemLocation, setNewItemLocation] = useState('Pantry Closet');
    const [newItemType, setNewItemType] = useState('Pantry Item');
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Pantry Item', 'Supply'

    // Authentication and Firestore setup
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
            } else {
                // If no user, try to sign in with custom token or anonymously
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Error during Firebase authentication:", error);
                    setIsAuthReady(true); // Still set ready even if auth fails to avoid infinite loading
                }
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Firestore real-time listener for items
    useEffect(() => {
        if (!isAuthReady || !userId) return; // Wait for authentication to be ready

        // Public collection path
        const itemsCollectionRef = collection(db, `artifacts/${appId}/public/data/pantry_tracker`);

        const unsubscribe = onSnapshot(itemsCollectionRef, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(fetchedItems);
        }, (error) => {
            console.error("Error fetching items:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId]); // Re-run when auth state changes

    // Function to add a new item
    const handleAddItem = async () => {
        if (newItemName.trim() === '' || newItemQuantity <= 0) {
            console.log("Please enter a valid item name and quantity.");
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/pantry_tracker`), {
                name: newItemName.trim(),
                quantity: parseInt(newItemQuantity),
                location: newItemLocation,
                type: newItemType,
                userId: userId, // Store the user ID for potential multi-user features
                createdAt: new Date().toISOString()
            });
            setNewItemName('');
            setNewItemQuantity(1);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };

    // Function to update item quantity
    const updateQuantity = async (id, currentQuantity, delta) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/pantry_tracker`, id);
        const newQuantity = currentQuantity + delta;
        if (newQuantity >= 0) {
            try {
                await updateDoc(itemRef, { quantity: newQuantity });
            } catch (error) {
                console.error("Error updating quantity: ", error);
            }
        }
    };

    // Function to delete an item
    const deleteItem = async (id) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/pantry_tracker`, id);
        try {
            await deleteDoc(itemRef);
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    };

    // Group items by location and then filter by type
    const groupedItems = items
        .filter(item => activeFilter === 'All' || item.type === activeFilter)
        .reduce((acc, item) => {
            if (!acc[item.location]) {
                acc[item.location] = [];
            }
            acc[item.location].push(item);
            return acc;
        }, {});

    const locations = ['Pantry Closet', 'Basement', 'Office', 'Garage'];

    // Icon mapping for locations
    const locationIcons = {
        'Pantry Closet': <Home className="w-5 h-5 text-gray-600" />,
        'Basement': <Box className="w-5 h-5 text-gray-600" />,
        'Office': <Briefcase className="w-5 h-5 text-gray-600" />,
        'Garage': <Car className="w-5 h-5 text-gray-600" />,
    };

    // Icon mapping for item types
    const typeIcons = {
        'Pantry Item': <Utensils className="w-4 h-4 text-blue-500" />,
        'Supply': <Lightbulb className="w-4 h-4 text-green-500" />,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 text-white text-center rounded-t-2xl">
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Home Inventory Tracker</h1>
                    <p className="text-sm sm:text-base opacity-90">Organize your pantry and supplies with ease!</p>
                    {userId && (
                        <p className="text-xs sm:text-sm mt-2 opacity-75">
                            User ID: <span className="font-mono break-all">{userId}</span>
                        </p>
                    )}
                </div>

                {/* Filter Buttons */}
                <div className="p-4 bg-gray-50 flex justify-center space-x-3 sm:space-x-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveFilter('All')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeFilter === 'All' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        All Items
                    </button>
                    <button
                        onClick={() => setActiveFilter('Pantry Item')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeFilter === 'Pantry Item' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Pantry Items
                    </button>
                    <button
                        onClick={() => setActiveFilter('Supply')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeFilter === 'Supply' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Supplies
                    </button>
                </div>

                {/* Add New Item Form */}
                <div className="p-6 border-b border-gray-200 bg-white">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add New Item</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Item Name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        />
                        <input
                            type="number"
                            placeholder="Quantity"
                            value={newItemQuantity}
                            onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        />
                        <select
                            value={newItemLocation}
                            onChange={(e) => setNewItemLocation(e.target.value)}
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white"
                        >
                            {locations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <select
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value)}
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white"
                        >
                            <option value="Pantry Item">Pantry Item</option>
                            <option value="Supply">Supply</option>
                        </select>
                    </div>
                    <button
                        onClick={handleAddItem}
                        className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
                    >
                        <PlusCircle className="mr-2" /> Add Item
                    </button>
                </div>

                {/* Item Display Sections */}
                <div className="p-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {locations.map(location => (
                        <div key={location} className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                {locationIcons[location]}
                                <span className="ml-2">{location}</span>
                            </h3>
                            {groupedItems[location] && groupedItems[location].length > 0 ? (
                                <div className="space-y-3">
                                    {groupedItems[location].map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg shadow-sm border border-gray-200">
                                            <div className="flex items-center">
                                                {typeIcons[item.type]}
                                                <span className="ml-2 text-gray-800 font-medium">{item.name}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity, -1)}
                                                    className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition duration-150"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <MinusCircle className="w-5 h-5" />
                                                </button>
                                                <span className="text-lg font-semibold text-gray-900 min-w-[24px] text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity, 1)}
                                                    className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition duration-150"
                                                    aria-label="Increase quantity"
                                                >
                                                    <PlusCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    className="ml-3 p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition duration-150"
                                                    aria-label="Delete item"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No {activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' '}items in this location.</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default App;
