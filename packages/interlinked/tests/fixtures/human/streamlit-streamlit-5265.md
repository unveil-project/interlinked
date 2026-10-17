### Problem

It would be great to have a way to tell when an input (e.g. a text box or text area) has focus. Right now I'm trying to work around this with the on_change event which is non-ideal, but that isn't working since the on_change event only fires for text areas when the control loses focus, and for text boxes when the user hits ENTER. It would be wonderful to have this feature.

### Solution

**MVP:** add an on_focus parameter to each input control's factory function that is called when that control gets focus, the same way the onfocus event works in HTML with JavaScript.

**Preferred solution:** instead of a one-off solution for one event, it would be fantastic if all standard HTML events were implemented in Streamlit with their standard behavior (so e.g. on_change would fire with every change and not only on ENTER or on loss of focus). This would make Streamlit much more attractive and easy-to-use for UI developers coming from frameworks like React and Angular. 

### Additional context

N/A

---

Community voting on feature requests enables the Streamlit team to understand which features are most important to our users.

**If you'd like the Streamlit team to prioritize this feature request, please use the 👍 (thumbs up emoji) reaction in response to the initial post.**
