import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, FlatList, Image, Keyboard,
    KeyboardAvoidingView, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput,
    View, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import getMessageAge from "../server/utils/getMessageAge";
import { socket } from "./socket";

type Message = {
    id: string;
    text?: string;
    imageUri?: string;
    isMe: boolean;
    user: string;
    createdAt: number;
    type?: 'user' | 'system' | 'image';
    flagged?: boolean;
};

type PinnedNote = {
    _id: string;
    text: string;
    user: string;
    pinnedAt: number;
};

export default function ChatScreen() {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
    const keyboardHeight = useRef(new Animated.Value(0)).current;
    const joinedRef = useRef(false);
    const [room, setRoom] = useState<string | null>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [input, setInput] = useState('');
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [typingUser, setTypingUser] = useState<Set<string>>(new Set());
    const sendBtnScale = useRef(new Animated.Value(1)).current;

    const [username] = useState(() => {
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `Ghost${randomNum}`;
    });

    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        let showSub: any;
        let hideSub: any;

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
            }
            if (!joinedRef.current) {
                socket.emit("join-with-locations", { lat: coords.latitude, long: coords.longitude, username });
                joinedRef.current = true;
            }
        })();

        socket.on("room-joined", (roomId) => setRoom(roomId));

        socket.on("receive-message", msg => {
            setMessages(prev => [...prev, {
                id: msg.id,
                user: msg.user,
                text: msg.text,
                imageUri: msg.imageUri,
                type: msg.type,
                flagged: msg.flagged,
                createdAt: msg.createdAt,
                isMe: msg.senderId === socket.id,
            }]);
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
        });

        socket.on("room-users-count", (count) => setOnlineCount(count));

        socket.on("user-typing", (user: string) => {
            setTypingUser(prev => { const next = new Set(prev); next.add(user); return next; });
        });

        socket.on("user-stop-typing", (user: string) => {
            setTypingUser(prev => { const next = new Set(prev); next.delete(user); return next; });
        });

        setMessages(prev => [...prev, {
            id: Date.now().toString() + Math.random(),
            text: `${username} joined the area 👻`,
            isMe: false,
            user: 'System',
            createdAt: Date.now(),
            type: 'system',
        }]);

        socket.on("pinned-notes", (notes) => {
            setPinnedNotes(notes.map((n: any) => ({ ...n, pinnedAt: new Date(n.pinnedAt).getTime() })));
        });

        socket.on("new-pinned-note", note => {
            setPinnedNotes(prev => [...prev, note]);
        });

        socket.on("image-rejected", ({ reason }) => {
            Alert.alert("Image rejected", `Your image was rejected: ${reason}`);
        });

        return () => {
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
        };
    }, []);

    const addLeaveMessage = () => {
        setMessages(prev => [...prev, {
            id: Date.now().toString() + Math.random(),
            text: `${username} left the area 👋`,
            isMe: false,
            user: 'System',
            createdAt: Date.now(),
            type: 'system',
        }]);
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
                base64: true,
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            const base64Img = `data:image/jpeg;base64,${asset.base64}`;
            const formData = new FormData();
            formData.append("file", base64Img);
            formData.append("upload_preset", "ghost_chat_unsigned");
            const res = await fetch(`https://api.cloudinary.com/v1_1/ds4gk8wwc/image/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.secure_url) {
                Alert.alert("Upload failed", data.error?.message || "Failed to upload image");
                return;
            }
            socket.emit("send-image", { room, user: username, imageUrl: data.secure_url, moderation: data.moderation });
        } catch (error) {
            Alert.alert("Error", `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    const handleTyping = (text: string) => {
        if (!room) return;
        setInput(text);
        socket.emit("typing", { room, username });
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit("stop-typing", { room, username });
        }, 800);
    };

    const sendMessage = () => {
        if (!room || !input.trim()) return;
        const message = {
            id: Date.now().toString() + Math.random(),
            text: input,
            user: username,
            createdAt: Date.now(),
            senderId: socket.id,
        };
        socket.emit("send-message", { room, message });
        setInput('');
        setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    };

    const pinnedMessage = (text: string) => {
        if (pinnedNotes.some(n => n.text === text)) return;
        socket.emit("create-pinned-note", { roomId: room, text, user: username });
    };

    async function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
        if (Platform.OS === "web") {
            return new Promise((resolve) => {
                if (!navigator.geolocation) { resolve(null); return; }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    () => resolve(null),
                    { enableHighAccuracy: true }
                );
            });
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return null;
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return location.coords;
    }

    const Wrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

    const handleSendPressIn = () => {
        Animated.spring(sendBtnScale, { toValue: 0.92, useNativeDriver: true }).start();
    };
    const handleSendPressOut = () => {
        Animated.spring(sendBtnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    };

    // Format room name nicely
    const roomDisplay = room ? room.replace('room_', '').split('_').slice(0, 2).join(', ') : '...';

    return (
        <Wrapper
            style={styles.container}
            {...(Platform.OS === "ios" ? { behavior: "padding", keyboardVerticalOffset: 90 } : {})}
        >
            {/* Background */}
            <LinearGradient colors={['#0A0A14', '#0D0D1C', '#0A0A14']} style={StyleSheet.absoluteFill} />
            <View style={styles.bgGlowTL} pointerEvents="none" />
            <View style={styles.bgGlowBR} pointerEvents="none" />
            {/* Ghost watermark */}
            <View style={styles.ghostWatermarkWrapper} pointerEvents="none">
            <Image
                source={require('./assets/ghost-watermark.png')}
                style={styles.ghostWatermark}
            // pointerEvents="none"
            />
            </View>


            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
                <BlurView intensity={50} tint="dark" style={styles.pinnedContainer}>
                    <View style={styles.pinnedHeader}>
                        <Text style={styles.pinnedPin}>📌</Text>
                        <Text style={styles.pinnedTitle}>Pinned in this area</Text>
                    </View>
                    <ScrollView style={styles.pinnedScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {pinnedNotes.map(note => (
                            <View key={String(note._id)} style={styles.pinnedItem}>
                                <Text style={styles.pinnedUser}>{note.user}</Text>
                                <Text style={styles.pinnedText}>{note.text}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </BlurView>
            )}

            {/* Online indicator bar */}
            <BlurView intensity={30} tint="dark" style={styles.onlineBar}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>
                    {onlineCount} ghost{onlineCount === 1 ? '' : 's'} nearby
                </Text>
                <View style={styles.onlineSep} />
                <Text style={styles.roomText} numberOfLines={1}>📍 {roomDisplay}</Text>
            </BlurView>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                keyboardDismissMode="on-drag"
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item }) => {
                    if (item.type === 'system') {
                        return (
                            <View style={styles.systemRow}>
                                <View style={styles.systemLine} />
                                <Text style={styles.systemMessage}>{item.text}</Text>
                                <View style={styles.systemLine} />
                            </View>
                        );
                    }
                    return (
                        <Pressable
                            onLongPress={() => {
                                if (!item.text) return;
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                pinnedMessage(item.text);
                            }}
                            disabled={item.type === 'system'}
                            delayLongPress={400}
                        >
                            <View style={[styles.bubbleRow, item.isMe && styles.bubbleRowMe]}>

                                <View style={[styles.messageBubble, item.isMe ? styles.myMessage : styles.otherMessage]}>
                                    {!item.isMe && <Text style={styles.username}>{item.user}</Text>}
                                    {item.type === 'image' && item.imageUri ? (
                                        <Pressable
                                            onPress={() => setPreviewImage(item.imageUri!)}
                                            onLongPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                                pinnedMessage('📷 Image');
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
                                    <Text style={[styles.time, item.isMe && styles.timeMe]}>
                                        {getMessageAge(item.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    );
                }}
            />

            {/* Typing indicator */}
            {typingUser.size > 0 && (
                <View style={styles.typingContainer}>
                    <BlurView intensity={40} tint="dark" style={styles.typingBubble}>
                        {[...typingUser].map(user => (
                            <Text key={user} style={styles.typing}>👻 {user} is typing...</Text>
                        ))}
                    </BlurView>
                </View>
            )}

            {/* Input bar */}
            <Animated.View
                style={[
                    styles.inputWrapper,
                    Platform.OS === 'android' && { marginBottom: keyboardHeight },
                ]}
            >
                <BlurView intensity={70} tint="dark" style={styles.inputContainer}>
                    <Pressable onPress={pickImage} style={styles.imageButton}>
                        <Text style={{ fontSize: 22 }}>📷</Text>
                    </Pressable>
                    <TextInput
                        value={input}
                        onChangeText={handleTyping}
                        placeholderTextColor="rgba(160,160,200,0.45)"
                        placeholder="Whisper something..."
                        style={styles.input}
                        multiline
                        maxLength={500}
                    />
                    <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
                        <Pressable
                            onPressIn={handleSendPressIn}
                            onPressOut={handleSendPressOut}
                            onPress={sendMessage}
                            style={styles.sendButtonOuter}
                        >
                            <LinearGradient
                                colors={input.trim() ? ['#7C3AED', '#6C5CE7'] : ['#2A2A42', '#222238']}
                                style={styles.sendButton}
                            >
                                <Text style={[styles.sendText, !input.trim() && styles.sendTextDisabled]}>
                                    Send
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </BlurView>
            </Animated.View>

            {/* Image preview modal */}
            <Modal
                visible={!!previewImage}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <View style={styles.previewOverlay}>
                    <Pressable style={styles.previewClose} onPress={() => setPreviewImage(null)}>
                        <BlurView intensity={60} tint="dark" style={styles.previewCloseBtn}>
                            <Text style={styles.previewCloseText}>✕</Text>
                        </BlurView>
                    </Pressable>
                    {previewImage && (
                        <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </Wrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A14',
    },
    bgGlowTL: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#5B21B6',
        opacity: 0.12,
    },
    bgGlowBR: {
        position: 'absolute',
        bottom: 100,
        right: -80,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#4C1D95',
        opacity: 0.10,
    },

    // Online bar
    onlineBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(13, 13, 28, 0.6)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(108, 92, 231, 0.15)',
        gap: 8,
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#34D399',
        shadowColor: '#34D399',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    onlineText: {
        fontSize: 13,
        color: '#A0A0C8',
        fontWeight: '500',
    },
    onlineSep: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        marginHorizontal: 2,
    },
    roomText: {
        fontSize: 12,
        color: 'rgba(139, 92, 246, 0.7)',
        flex: 1,

    },

    // Pinned
    pinnedContainer: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(15, 15, 30, 0.7)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(108, 92, 231, 0.18)',
    },
    pinnedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    pinnedPin: {
        fontSize: 13,
    },
    pinnedTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#C9A227',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    pinnedScroll: {
        maxHeight: 100,
    },
    pinnedItem: {
        backgroundColor: 'rgba(108, 92, 231, 0.08)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#7C3AED',
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.2)',
    },
    pinnedUser: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8B5CF6',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    pinnedText: {
        fontSize: 14,
        color: '#E8E8F8',
    },

    // Messages
    messagesContainer: {
        padding: 12,
        paddingBottom: 8,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    bubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        gap: 8,
    },
    bubbleRowMe: {
        flexDirection: 'row-reverse',
    },

    messageBubble: {
        maxWidth: '76%',
        padding: 12,
        borderRadius: 18,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    myMessage: {
        backgroundColor: '#6C5CE7',
        borderBottomRightRadius: 4,
        shadowColor: '#6C5CE7',
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    otherMessage: {
        backgroundColor: '#1A1A2E',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.2)',
    },
    username: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9D8FFF',
        marginBottom: 5,
        letterSpacing: 0.3,
    },
    messageText: {
        fontSize: 15,
        color: '#F0F0FF',
        lineHeight: 21,
    },
    time: {
        fontSize: 10,
        color: 'rgba(200,200,230,0.5)',
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    timeMe: {
        alignSelf: 'flex-end',
        color: 'rgba(255,255,255,0.45)',
    },
    chatImage: {
        width: 200,
        height: 200,
        borderRadius: 14,
        marginTop: 4,
    },

    // System messages
    systemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 8,
        gap: 10,
    },
    systemLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(108, 92, 231, 0.15)',
    },
    systemMessage: {
        textAlign: 'center',
        color: 'rgba(160, 160, 200, 0.55)',
        fontSize: 12,
        fontStyle: 'italic',
        paddingHorizontal: 4,
    },

    // Typing
    typingContainer: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    typingBubble: {
        alignSelf: 'flex-start',
        borderRadius: 16,
        overflow: 'hidden',
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: 'rgba(26, 26, 46, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.2)',
    },
    typing: {
        fontSize: 12,
        color: 'rgba(157, 143, 255, 0.7)',
        fontStyle: 'italic',
    },

    // Input
    inputWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(108, 92, 231, 0.15)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(13, 13, 28, 0.8)',
        gap: 10,
    },
    imageButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(30, 30, 54, 0.8)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 11,
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.25)',
        maxHeight: 100,
        lineHeight: 20,
    },
    sendButtonOuter: {
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    sendButton: {
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.3,
    },
    sendTextDisabled: {
        color: 'rgba(200,200,220,0.35)',
    },

    // Modal preview
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewClose: {
        position: 'absolute',
        top: 48,
        right: 20,
        zIndex: 10,
    },
    previewCloseBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    previewCloseText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '300',
    },
    ghostWatermark: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0.6,
        resizeMode: 'cover',
        zIndex: 0,
        mixBlendMode: 'screen'
    },
    ghostWatermarkWrapper: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
        // React Native's blend mode support
        // style: { mixBlendMode: 'screen' }
    },
});