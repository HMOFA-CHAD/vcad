// Override to fix React 19 / React 18 JSX compatibility
import type {} from 'react/jsx-runtime';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
  }
}
