import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Send, Trash2, User } from 'lucide-react';

interface Review {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface ReviewSectionProps {
  locationId: string;
}

export default function ReviewSection({ locationId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const isAdmin = user?.email === 'mukkuc41@gmail.com';

  useEffect(() => {
    if (!locationId) return;

    const q = query(
      collection(db, 'reviews'),
      where('locationId', '==', locationId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(revs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        locationId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous Explorer',
        rating: newRating,
        comment: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setNewRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string, reviewOwnerId: string) => {
    if (!user) return;
    if (user.uid !== reviewOwnerId && !isAdmin) return;
    
    if (!window.confirm("Delete this review?")) return;

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  return (
    <div className="mt-16 pt-16 border-t border-[#141414]/5">
      <div className="flex items-center gap-3 mb-10">
        <MessageSquare className="w-6 h-6 text-[#00af87]" />
        <h3 className="text-3xl font-serif italic tracking-tight">Community <span className="opacity-40 text-sm font-sans uppercase tracking-[0.2em] font-black not-italic ml-2">Insights</span></h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-12 bg-[#f8f8f5] p-8 rounded-[32px]">
          <div className="flex items-center gap-4 mb-6">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Your Rating</span>
             <div className="flex gap-1">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   type="button"
                   onClick={() => setNewRating(star)}
                   className={`p-1 transition-all ${star <= newRating ? 'text-[#00af87] scale-110' : 'text-[#141414]/10 hover:text-[#00af87]/40'}`}
                 >
                   <Star className={`w-5 h-5 ${star <= newRating ? 'fill-current' : ''}`} />
                 </button>
               ))}
             </div>
          </div>
          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full bg-white border border-[#141414]/5 rounded-2xl p-6 text-sm outline-none focus:border-[#00af87]/20 transition-all min-h-[120px] resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="absolute bottom-4 right-4 bg-[#141414] text-white p-4 rounded-xl hover:scale-105 transition-all disabled:opacity-20 disabled:scale-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-12 bg-[#f8f8f5] p-8 rounded-[32px] text-center">
           <p className="text-sm opacity-40 uppercase tracking-widest font-black">Sign in to leave a review</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#00af87] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group border-b border-[#141414]/5 last:border-0 pb-8"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f8f8f5] flex items-center justify-center border border-[#141414]/5">
                       <User className="w-5 h-5 opacity-20" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#141414]">{review.userName}</div>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-[#00af87] fill-current' : 'text-[#141414]/10'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-20">
                      {review.createdAt ? new Date(review.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </span>
                    {(user?.uid === review.userId || isAdmin) && (
                      <button
                        onClick={() => handleDelete(review.id, review.userId)}
                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg"
                        title="Remove Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[#141414]/70 leading-relaxed italic">{review.comment}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 opacity-20 bg-[#f8f8f5]/50 rounded-[32px] border border-dashed border-[#141414]/10">
          <p className="text-xs font-black uppercase tracking-[0.2em]">No community insights yet</p>
        </div>
      )}
    </div>
  );
}
