import {useQuery} from "@tanstack/react-query";
import {fetchChatSummary,type ChatMode} from "../../lib/chat";

export default function ChatUnreadBadge({
    mode,
}:{
    mode:ChatMode;
}){
    const query=useQuery({
        queryKey:["chat","summary",mode],
        queryFn:()=>fetchChatSummary(mode),
        refetchInterval:15000,
        staleTime:5000,
    });

    const unread=query.data?.unread ?? 0;

    if(!unread){
        return null;
    }

    return (
        <span className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
            {unread>99?"99+":unread}
        </span>
    );
}
