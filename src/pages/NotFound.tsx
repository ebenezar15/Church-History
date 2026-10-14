import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/Icon';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="mb-4 text-accent">
        <Icon name="scroll" size={56} />
      </motion.div>
      <h1 className="mb-2 text-3xl font-bold">This page is a lost manuscript</h1>
      <p className="mb-6 text-muted">The entry may not have been written yet, or its link has changed.</p>
      <Link to="/" className="btn btn-primary">Return to the river <Icon name="arrow" /></Link>
    </div>
  );
}
