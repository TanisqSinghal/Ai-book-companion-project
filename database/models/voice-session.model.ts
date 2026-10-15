import {ISessionMessage, IVoiceSession} from "@/types";
import { Schema } from "mongoose";
import { registerModel } from "./registerModel";

const SessionMessageSchema = new Schema<ISessionMessage>({
    role: {type: String, enum: ["user", "assistant"], required: true},
    content: {type: String, required: true},
    createdAt: {type: Date, required: true, default: Date.now},
}, {_id: false});

const VoiceSessionSchema = new Schema<IVoiceSession>({
    clerkId: {type: String, required: true, index: true},
    bookId: {type: Schema.Types.ObjectId, ref: "Book", required: true},
    startedAt: {type: Date, required: true, default: Date.now},
    endedAt: {type: Date},
    durationSeconds: {type: Number, required: true, default: 0},
    billingPeriodStart: {type: Date, required: true, index: true},
    messages: {type: [SessionMessageSchema], default: []},
}, {timestamps: true});

VoiceSessionSchema.index({clerkId: 1, billingPeriodStart: 1});
VoiceSessionSchema.index({clerkId: 1, startedAt: -1});

const VoiceSession = registerModel<IVoiceSession>("VoiceSession", VoiceSessionSchema);

export default VoiceSession;