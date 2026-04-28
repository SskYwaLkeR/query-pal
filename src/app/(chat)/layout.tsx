import { type ReactNode } from "react";
import { ChatContainer } from "@/components/chat/chat-container";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ChatContainer />
      {/* pages return null — children rendered for Next.js compliance */}
      <div className="hidden">{children}</div>
    </>
  );
}
