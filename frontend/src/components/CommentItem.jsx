import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { parseSafeDate } from "../utils/date";

export const CommentItem = ({ comment }) => {
  return (
    <div className="flex gap-3 items-start text-xs py-1">
      <Link to={`/profile/${comment.username}`} className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-bold overflow-hidden">
          {comment.profile_pic ? (
            <img src={comment.profile_pic} alt={comment.username} className="w-full h-full object-cover" />
          ) : (
            comment.username?.charAt(0).toUpperCase()
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link to={`/profile/${comment.username}`} className="font-bold text-white hover:text-purple-400 transition-colors">
            {comment.username}
          </Link>
          <span className="text-zinc-300 break-words leading-relaxed">{comment.comment}</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          {formatDistanceToNow(parseSafeDate(comment.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};
