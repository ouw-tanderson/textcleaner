/* Simplified macros + click helper. */

// Utilities
const unescapeXml = ( str = '' ) =>
  str
    .replace ( /&lt;/g , '<' )
    .replace ( /&gt;/g , '>' )
    .replace ( /&quot;/g , '"' )
    .replace ( /&apos;/g , '\'' )
    .replace ( /&amp;/g , '&' );

const applyContext = ( text , context = {} ) =>
  Object.keys ( context ).reduce (
    ( t , k ) => t.split ( `\${${ k }}` ).join ( String ( context[ k ] ) ) ,
    text
  );

// Simplified macros: find can be a string or RegExp; replace supports $1.. captures and ${token} placeholders via
// context.
const macros = [
  { name : 'Trim Trailing Space and Save' , find : /\s+$/gm , replace : '' } ,
  { name : 'li-replace' , find : /<li>/g , replace : '<li class="productFacts__benefit">' } ,
  { name : 'ul-replace' , find : /<(ul|ol)>/g , replace : '<$1 class="list">' } ,
  {
    name : 'phone-replace' ,
    find : '${phone}' ,
    replace : '<a href="tel:${phone}">${phone}</a>'
  } ,
  {
    name : 'btn-search' ,
    find : /<p>Button: <a href="[^"]+">[^<]+<\/a><\/p>/g ,
    replace : '<p><a href="${base_directory}schedule/" class="button">Schedule An In-Home Consultation</a></p>'
  } ,
  {
    name : 'button outline -1' ,
    // capture text and href
    find : /Outline Button: \[text: ([^\]]+)\] <a href="([^"]+)">[^<]+<\/a>/g ,
    replace : '<a href="$2" class="button -styleOutline">$1</a>'
  } ,
  {
    name : 'outline btn -2' ,
    find : /Outline Button: \[([^\]]+)\] <a href="([^"]+)">[^<]+<\/a>/g ,
    replace : '<a href="$2" class="button -styleOutline">$1</a>'
  }
];

// Simple macro applier
function applyMacro ( inputText = '' , macroName , context = {} ) {
  const macro = macros.find ( m => m.name === macroName );
  if ( ! macro ) throw new Error ( `Macro not found: ${ macroName }` );
  
  let text = inputText;
  
  // If find is a string, treat as token replacement after applying context to replace template
  if ( typeof macro.find === 'string' ) {
    const token = macro.find;
    const replacement = applyContext ( typeof macro.replace === 'string' ? macro.replace : '' , context );
    // replace all occurrences (simple)
    text = text.split ( token ).join ( replacement );
    return text;
  }
  
  // If find is RegExp
  if ( macro.find instanceof RegExp ) {
    const replacementTemplate = typeof macro.replace === 'string' ? macro.replace : '';
    // First apply context placeholders in replacement template
    const replacement = applyContext ( replacementTemplate , context );
    try {
      text = text.replace ( macro.find , replacement );
    } catch ( e ) {
      // Fallback: no-op on bad regex
    }
    return text;
  }
  
  // Unsupported find type
  return text;
}

// Attach a click handler to a button that applies a macro.
// buttonSelector: CSS selector for button (or an Element). sourceSelector/targetSelector accept CSS selectors or
// Elements. context: optional object for ${placeholders} like { phone: '123-456' }
function attachMacroClick ( buttonSelector , sourceSelector , targetSelector , macroName , context = {} ) {
  if ( typeof document === 'undefined' ) {
    throw new Error ( 'attachMacroClick requires a DOM (document) to be available' );
  }
  
  const resolve = sel => ( typeof sel === 'string' ? document.querySelector ( sel ) : sel );
  const btn = resolve ( buttonSelector );
  const src = resolve ( sourceSelector );
  const tgt = resolve ( targetSelector );
  
  if ( ! btn ) throw new Error ( 'button not found' );
  if ( ! src ) throw new Error ( 'source element not found' );
  if ( ! tgt ) throw new Error ( 'target element not found' );
  
  const fcihandler = () => {
    const value = ( 'value' in src ) ? src.value : src.textContent;
    const result = applyMacro ( String ( value ) , macroName , context );
    if ( 'value' in tgt ) tgt.value = result;
    else tgt.textContent = result;
  };
  
  btn.addEventListener ( 'click' , fcihandler );
  return () => btn.removeEventListener ( 'click' , fcihandler ); // returns an unsubscribe function
}

// Default export behavior: attach to globalThis/window and support CommonJS/AMD if present
const fciScripts = { macros , applyMacro , attachMacroClick };

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( () => fciScripts );
} else if ( typeof module !== 'undefined' && module.exports ) {
  // CommonJS / Node
  module.exports = fciScripts;
}

// Prefer globalThis, fallback to window for older environments
try {
  if ( typeof globalThis !== 'undefined' ) globalThis.fciScripts = fciScripts;
  else if ( typeof window !== 'undefined' ) window.fciScripts = fciScripts;
} catch (e) {
  // ignore in restricted environments
}
