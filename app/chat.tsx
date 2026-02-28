import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import getMessageAge from "../server/utils/getMessageAge";
import { socket } from "./socket";
import { BlurView } from 'expo-blur';
//Create socket once outside component




type Message = {
    id: string;
    text?: string;          // optional now
    imageUri?: string;
    isMe: boolean;
    user: string;
    createdAt: number;
    type?: 'user' | 'system' | 'image';
    flagged?: boolean

};

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
};



export default function ChatScreen() {

    type PinnedNote = {
        _id: string;
        text: string;
        user: string;
        pinnedAt: number;
    };
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
    const keyboardHeight = useRef(new Animated.Value(0)).current;

    const joinedRef = useRef(false);
    const [room, setRoom] = useState<string | null>(null); // later can be GPS based

    const [onlineCount, setOnlineCount] = useState(0);

    const flatListRef = useRef<FlatList>(null);

    const [username] = useState(() => {
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `Ghost${randomNum}`;
    });

    const [typingUser, setTypingUser] = useState<Set<string>>(new Set());


    const [messages, setMessages] = useState<Message[]>([
        // {
        //     id: '1', text: 'Hey anushka this side 🥰?', isMe: false, user: 'Ghost128', createdAt: Date.now() - 60000,
        // },
        // {
        //     id: '2', text: 'Yes', isMe: true, user: username, createdAt: Date.now() - 60000,
        // },
        // {
        //     id: '3', text: 'Wanna play a game cutie🥵', isMe: false, user: 'Ghost128', createdAt: Date.now() - 60000,
        // },
        // { id: '4', text: 'yss 😍', isMe: true, user: username, createdAt: Date.now() - 30000, },
        // { id: '5', text: '3rd floor room no 104', isMe: false, user: 'Ghost128', createdAt: Date.now() - 30000, }
    ]);

    useEffect(() => {

        let showSub: any;
        let hideSub: any;

        // const interval=setInterval(()=>{
        //     setNow(Date.now());

        // } ,60 *1000 );  //runs every 1min

        if (Platform.OS === "android") {
            showSub = Keyboard.addListener("keyboardDidShow", (e) => {
                Animated.timing(keyboardHeight, {
                    toValue: e.endCoordinates.height,
                    duration: 250,
                    useNativeDriver: false,
                }).start();
            });

            hideSub = Keyboard.addListener("keyboardDidHide", () => {
                Animated.timing(keyboardHeight, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: false,
                }).start();
            });
        }

        (async () => {
            const coords = await getLocation();

            if (!coords) {

                socket.emit("join-with-locations", { lat: null, long: null });
                return;
            };
            if (!joinedRef.current) {
                socket.emit("join-with-locations", { lat: coords.latitude, long: coords.longitude, username });
                joinedRef.current = true;
            }
        })();

        socket.on("room-joined", (roomId) => {
            setRoom(roomId);
        })

        socket.on("receive-message", msg => {
            setMessages(prev => [
                ...prev,
                {
                    id: msg.id,
                    user: msg.user,
                    text: msg.text,
                    imageUri: msg.imageUri,
                    type: msg.type,
                    flagged: msg.flagged,
                    createdAt: msg.createdAt,
                    isMe: msg.senderId === socket.id, // 👈 THIS decides bubble side
                },
            ]);
        });

        socket.on("room-history", (oldMessages) => {
            const formatted = oldMessages.map((m: any) => ({
                id: m._id || m.id,
                user: m.user,
                text: m.text,
                imageUri: m.imageUri,
                type: m.type,
                flagged: m.flagged,
                createdAt: new Date(m.createdAt).getTime(),
                isMe: false,
            }));
            setMessages(formatted);
        })

        socket.on("room-users-count", (count) => {
            setOnlineCount(count)
        })

        socket.on("user-typing", (user: string) => {

            setTypingUser(prev => {
                const next = new Set(prev)
                next.add(user);
                return next
            });

        });


        socket.on("user-stop-typing", (user: string) => {
            setTypingUser(prev => {
                const next = new Set(prev);
                next.delete(user);
                return next;
            });
        });


        setMessages(prev => [
            ...prev,
            {
                id: Date.now().toString() + Math.random(),
                text: `${username} joined the area 👻`,
                isMe: false,
                user: 'System',
                createdAt: Date.now(),
                type: 'system',
            },
        ]);

        socket.on("pinned-notes", (notes: Array<{ _id: string; text: string; user: string; pinnedAt: string | number | Date }>) => {
            setPinnedNotes(
                notes.map((n) => ({
                    ...n,
                    pinnedAt: new Date(n.pinnedAt).getTime()
                }))
            )
        });

        socket.on("new-pinned-note", note => {
            setPinnedNotes(prev => [...prev, note])
        })

        socket.on("image-rejected", ({ reason }) => {
            Alert.alert(
                "Image rejected",
                `Your image was rejected due to: ${reason}`
            );
        });



        // leave when exit
        return () => {
            // clearInterval(interval);
            socket.off("receive-message");
            socket.off("user-typing");
            socket.off("user-stop-typing");
            socket.off("room-users-count");
            socket.off("room-history");
            socket.off("pinned-notes");
            socket.off("new-pinned-note");
            socket.off("image-rejected");
            if (showSub) showSub.remove();
            if (hideSub) hideSub.remove();
            addLeaveMessage();

        }
    }, [])





    const [input, setInput] = useState('');

    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addLeaveMessage = () => {
        setMessages(prev => [
            ...prev,
            {
                id: Date.now().toString() + Math.random(),
                text: `${username} left the area 👋`,
                isMe: false,
                user: 'System',
                createdAt: Date.now(),
                type: 'system',
            },
        ]);
    };

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Permission required", "Allow access to gallery");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
                base64: true, // 🔥 IMPORTANT
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            const base64Img = `data:image/jpeg;base64,${asset.base64}`;

            // Create form data for Cloudinary
            const formData = new FormData();
            formData.append("file", base64Img);
            formData.append("upload_preset", "ghost_chat_unsigned");

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/ds4gk8wwc/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await res.json();

            // Check if upload was successful
            if (!res.ok || !data.secure_url) {
                console.error("Cloudinary upload failed:", data);
                Alert.alert("Upload failed", data.error?.message || "Failed to upload image");
                return;
            }

            // Send only URL to server
            socket.emit("send-image", {
                room,
                user: username,
                imageUrl: data.secure_url,
                moderation: data.moderation,
            });
        } catch (error) {
            console.error("Error in pickImage:", error);
            Alert.alert("Error", `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };


    const handleTyping = (text: string) => {
        if (!room) return;
        setInput(text);
        socket.emit("typing", { room, username });
        // clear old timer
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        // start new timer
        typingTimeout.current = setTimeout(() => {
            socket.emit("stop-typing", { room, username });
        }, 800);
    };

    const sendMessage = () => {
        if (!room) return; //wait for gps
        if (!input.trim()) return;

        const message = {
            id: Date.now().toString() + Math.random(),
            text: input,
            user: username,
            createdAt: Date.now(),
            senderId: socket.id,
        };

        socket.emit("send-message", { room, message });

        setInput('');

        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

    };

    const pinnedMessage = (text: string) => {
        if (pinnedNotes.some(n => n.text === text)) return;
        socket.emit("create-pinned-note", {
            roomId: room,
            text,
            user: username
        })
    }



    async function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
        //web expo
        // 🌐 WEB
        if (Platform.OS === "web") {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    console.log("Geolocation not supported");
                    resolve(null);
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        });
                    },
                    (error) => {
                        console.log("Browser location error:", error);
                        resolve(null);
                    },
                    { enableHighAccuracy: true }
                );
            });
        }

        //Mobile expo
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            console.log("Permission denied");
            return null;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        console.log(location);
        return location.coords;

    }

    const Wrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

    return (
        <Wrapper
            style={styles.container}
            {...(Platform.OS === "ios"
                ? { behavior: "padding", keyboardVerticalOffset: 80 }
                : {})}
        >

            {pinnedNotes.length > 0 && (
                <BlurView intensity={40} tint="dark" style={styles.pinnedContainer}>
                    <Text style={styles.pinnedTitle}>📌 Pinned in this area</Text>

                    <ScrollView
                        style={styles.pinnedScroll}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={true}
                    >

                        {pinnedNotes.map(note => (
                            <View key={String(note._id)} style={styles.pinnedItem}>
                                <Text style={styles.pinnedUser}>{note.user}</Text>
                                <Text style={styles.pinnedText}>
                                    {note.text}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </BlurView>
            )}

            {/* Messages */}
            <Text style={{ textAlign: "center", color: "#8888FF" }}>
                👻 Area chat · Nearby ghosts only
            </Text>
            <Text style={{
                textAlign: "center",
                color: "#A0A0B8",
                paddingVertical: 6,
                fontSize: 13
            }}>
                👻 {onlineCount} ghost{onlineCount === 1 ? "" : "s"} online in {room}
            </Text>

            <FlatList
                ref={flatListRef}
                keyboardDismissMode="on-drag"
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesContainer}
                renderItem={({ item }) => {

                    if (item.type === 'system') {
                        return (
                            <Text style={styles.systemMessage}>
                                {item.text}
                            </Text>
                        );
                    }
                    return (
                        <Pressable
                            onLongPress={() => {
                                if (!item.text) return;
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
                                pinnedMessage(item.text)
                            }
                            }
                            disabled={item.type === "system"}
                            delayLongPress={400}
                            android_ripple={{ color: "#ddd" }}

                        >
                            <View
                                style={[
                                    styles.messageBubble,
                                    item.isMe ? styles.myMessage : styles.otherMessage,
                                ]}
                            >

                                {!item.isMe && (
                                    <Text style={styles.username}>{item.user}</Text>
                                )}

                                {item.type === "image" && item.imageUri ? (
                                    <Pressable
                                        onPress={() => setPreviewImage(item.imageUri)}
                                        onLongPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            pinnedMessage("📷 Image");
                                        }}
                                    >
                                        <Image
                                            source={{ uri: item.imageUri }}
                                            style={styles.chatImage}
                                            blurRadius={item.flagged ? 20 : 0}
                                        />
                                    </Pressable>

                                ) : (

                                    <Text style={styles.messageText}>{item.text}</Text>
                                )}

                                <Text style={styles.time}>
                                    {getMessageAge(item.createdAt)}
                                </Text>
                            </View>
                        </Pressable>
                    )
                }}
            />

            <View style={styles.typingContainer}>
                {
                    [...typingUser].map(user => (
                        <Text key={user} style={styles.typing}>
                            👻 {user} is typing...
                        </Text>
                    ))
                }
            </View>

            {/* Input bar */}
            <Animated.View
                style={[
                    styles.inputContainer,
                    Platform.OS === "android" && { marginBottom: keyboardHeight },
                ]}
            >


                <Pressable onPress={pickImage} style={styles.imageButton}>
                    <Text style={{ fontSize: 20, color: "#A78BFA" }}>📷</Text>
                </Pressable>

                <TextInput
                    value={input}
                    onChangeText={handleTyping}
                    placeholderTextColor="#8A8AA3"
                    placeholder="Type a message..."
                    style={styles.input}
                />
                <Pressable style={styles.sendButton} onPress={sendMessage}>
                    <Text style={styles.sendText}>Send</Text>
                </Pressable>
            </Animated.View>
            <Modal
                visible={!!previewImage}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <View style={styles.previewOverlay}>
                    <Pressable
                        style={styles.previewClose}
                        onPress={() => setPreviewImage(null)}
                    >
                        <Text style={styles.previewCloseText}>✕</Text>
                    </Pressable>

                    {previewImage && (
                        <Image
                            source={{ uri: previewImage }}
                            style={styles.previewImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </Wrapper>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F0F1A",
    },
    messagesContainer: {
        padding: 10,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    messageBubble: {
        maxWidth: "78%",
        padding: 12,
        borderRadius: 18,
        marginVertical: 6,
    },

    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#6C5CE7",
    },

    otherMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#23233A",
    },
    messageText: {
        fontSize: 16,
        color: "#FFFFFF",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#2C2C45",
        borderColor: "#2C2C3E",
        backgroundColor: "#141425",
    },
    input: {
        flex: 1,
        backgroundColor: "#1E1E35",
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: "#FFFFFF",
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: "#8B5CF6",
        paddingHorizontal: 22, paddingVertical: 12,
        justifyContent: "center",
        borderRadius: 25,
        marginLeft: 10,
        shadowColor: "#8B5CF6",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    sendText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    username: {
        fontSize: 12,
        fontWeight: '600',
        color: "#B5B5FF",
        marginBottom: 4,
    },
    time: {
        fontSize: 11,
        color: "#BBBBCC",
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    typing: {
        fontSize: 12,
        color: '#888',
        marginLeft: 10,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    systemMessage: {
        textAlign: 'center',
        color: '#888',
        marginVertical: 8,
        fontSize: 13,
        fontStyle: 'italic',
    },
    typingContainer: {
        paddingHorizontal: 10,
        marginBottom: 6,
    },
    pinnedScroll: {
        maxHeight: 90
    },
    pinnedContainer: {
        backgroundColor: "#141425",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#2A2A40",
    },

    pinnedTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#8A6D1D",
        marginBottom: 6,
    },

    pinnedItem: {
        backgroundColor: "#1E1E35",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#2C2C45",
        borderLeftWidth: 4,
        borderLeftColor: "#8B5CF6",
    },

    pinnedUser: {
        fontSize: 12,
        fontWeight: "600",
        color: "#8B5CF6",
        marginBottom: 6,
    },

    pinnedText: {
        fontSize: 15,
        color: "#FFFFFF",
    },
    imageButton: {
        paddingHorizontal: 10,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 40,
    },

    chatImage: {
        width: 200,
        height: 200,
        borderRadius: 16,
        marginTop: 6,
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
        justifyContent: "center",
        alignItems: "center",
    },

    previewImage: {
        width: "100%",
        height: "100%",
    },

    previewClose: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 10,
    },

    previewCloseText: {
        fontSize: 28,
        color: "#fff",
    },


});
