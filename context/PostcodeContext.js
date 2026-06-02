import React, { createContext, useContext, useState } from 'react';

// Shared postcode state so a postcode entered on one tab carries to the others.
const PostcodeContext = createContext({ postcode: '', setPostcode: () => {} });

export function PostcodeProvider({ children }) {
  const [postcode, setPostcode] = useState('');
  return (
    <PostcodeContext.Provider value={{ postcode, setPostcode }}>
      {children}
    </PostcodeContext.Provider>
  );
}

export function usePostcode() {
  return useContext(PostcodeContext);
}
