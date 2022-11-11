function httpGet(url, callback, headers=[], method="GET", content=null) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open(method, url, true);
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  request.send(content);
}

function init() {
  getCSRF();
  getAssignment();
}

function getAssignment(callback) {
  if (!(/https{0,1}:\/\/edpuzzle.com\/assignments\/[a-f0-9]{1,30}\/watch/).test(window.location.href)) {
    alert("run this script on edpuzzle assignment")
    return;
  }
  
  var assignment_id = window.location.href.split("/")[4];
  if (typeof assignment_id == "undefined") {
    alert("couldn't not infer the assignment id");
    return;
  }
  var url1 = "https://edpuzzle.com/api/v3/assignments/"+assignment_id;

  httpGet(url1, function(){
    var assignment = JSON.parse(this.responseText);
    if ((""+this.status)[0] == "2") {
        getMedia(assignment);
    }
    else {
      alert(`Error: Status code ${this.status} recieved when attempting to fetch the assignment data.`)
    }
  });
}
function getMedia(assignment, needle="", request_count=1) {
  var media_id = assignment.teacherAssignments[0].contentId;
  var classroom_id = assignment.teacherAssignments[0].classroom.id;
  var url2 = "https://edpuzzle.com/api/v3/assignments/classrooms/"+classroom_id+"/students/?needle="+needle;
  httpGet(url2, function() {
    if ((""+this.status)[0] == "2") {
      var classroom = JSON.parse(this.responseText);
      if (classroom.medias.length == 0) {
        parseQuestions(null);
        return;
      }
      var media;
      for (let i=0; i<classroom.medias.length; i++) {
        media = classroom.medias[i];
        if (media._id == media_id) {
          parseQuestions(media.questions);
          return;
        }
      }
      getMedia(assignment, classroom.teacherAssignments[classroom.teacherAssignments.length-1]._id, request_count+1);
    }
    else {
      var questions = questions;
      content.innerHTML += `Error: Status code ${this.status} recieved when attempting to fetch the answers.`;
    }
  });
}

function parseQuestions(questions) {
  var questions = questions;
  
  if (questions == null) {
    content.innerHTML += `<p style="font-size: 12px">Error: Could not get the media for this assignment. </p>`;
    return;
  }
  
  var question;
  var counter = 0;
  var counter2 = 0;
  for (let i=0; i<questions.length; i++) {
    for (let j=0; j<questions.length-i-1; j++) {
      if (questions[j].time > questions[j+1].time){
       let question_old = questions[j];
       questions[j] = questions[j + 1];
       questions[j+1] = question_old;
     }
    }
  }
  
  for (let i=0; i<questions.length; i++) {
    question = questions[i];
    let choices_lines = [];
    
    if (typeof question.choices != "undefined") {
      let min = Math.floor(question.time/60).toString();
      let secs = Math.floor(question.time%60).toString();
      if (secs.length == 1) {
        secs = "0"+secs;
      }
      let timestamp = min+":"+secs;
      let question_content;
      if (question.body[0].text != "") {
        question_content = `<p>${question.body[0].text}</p>`;
      }
      else {
        question_content = question.body[0].html;
      }
      for (let j=0; j<question.choices.length; j++) {
        let choice = question.choices[j];
        if (typeof choice.body != "undefined") {
          counter++;
          let item_html;
          if (choice.body[0].text != "") {
            item_html = `<p>${choice.body[0].text}</p>`;
          }
          else {
            item_html = `${choice.body[0].html}`;
          }
          if (choice.isCorrect == true) {
            choices_lines.push(`<li class="choice choice-correct">${item_html}</li>`);
          }
          else {
            choices_lines.push(`<li class="choice">${item_html}</li>`);
          }
        }
      }
      
      let choices_html = choices_lines.join("\n");
      let table = ``
      if (counter2 != 0) {
        table += `<hr>`;
      }
      table += `
      <table>
        <tr class="header no_vertical_margin">
          <td class="timestamp_div no_vertical_margin">
            <p>[${timestamp}]</p>
          </td>
          <td class="question">
            ${question_content}
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <ul style="margin-top: 6px; margin-bottom: 0px; padding-left: 18px;">
              ${choices_html}
            </ul>
          </td>
        </tr>
      </table>
      `;
      
      content.innerHTML += table;
      counter2++;
    }
  }
  
  var questions = questions;
}

function getCSRF() {
  var csrfURL = "https://edpuzzle.com/api/v3/csrf";
  httpGet(csrfURL, function(){
    var data = JSON.parse(this.responseText);
    var csrf = data.CSRFToken;
    getAttempt(csrf, assignment);
  });
}

function getAttempt(csrf, assignment) {
  var id = assignment.teacherAssignments[0]._id;
  var attemptURL = "https://edpuzzle.com/api/v3/assignments/"+id+"/attempt";
  httpGet(attemptURL, function(){
    var data = JSON.parse(this.responseText);
    skipVideo(csrf, data);
  });
}

function skipVideo(csrf, attempt) {
  var id = attempt._id;
  var teacher_assignment_id = attempt.teacherAssignmentId;
  var referrer = "https://edpuzzle.com/assignments/"+teacher_assignment_id+"/watch";;
  var url2 = "https://edpuzzle.com/api/v4/media_attempts/"+id+"/watch";

  var content = {"timeIntervalNumber": 10};
  var headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];
  
  httpGet(url2, function(){
    var attemptId = attempt._id;
    var filteredQuestions = [];
    
    for (let i=0; i<questions.length; i++) {
      let question = questions[i];
      if (question.type != "multiple-choice") {continue;}
      
      if (filteredQuestions.length == 0) {
        filteredQuestions.push([question]);
      }
      else if (filteredQuestions[filteredQuestions.length-1][0].time == question.time) {
        filteredQuestions[filteredQuestions.length-1].push(question);
      }
      else {
        filteredQuestions.push([question]);
      }
    }
    
    if (filteredQuestions.length > 0) {
      var total = filteredQuestions.length;
      postAnswers(csrf, assignment, filteredQuestions, attemptId, total);
    }
  }, headers, "POST", JSON.stringify(content));
}

function postAnswers(csrf, assignment, remainingQuestions, attemptId, total) {
  var id = assignment.teacherAssignments[0]._id;
  var referrer = "https://edpuzzle.com/assignments/"+id+"/watch";
  var answersURL = "https://edpuzzle.com/api/v3/attempts/"+attemptId+"/answers";

  var content = {answers: []};
  var now = new Date().toISOString();
  var questionsPart = remainingQuestions.shift();
  for (let i=0; i<questionsPart.length; i++) {
    let question = questionsPart[i];
    let correctChoices = [];
    for (let j=0; j<question.choices.length; j++) {
      let choice = question.choices[j];
      if (choice.isCorrect) {
        correctChoices.push(choice._id)
      }
    }
    content.answers.push({
      "questionId": question._id,
      "choices": correctChoices,
      "type": "multiple-choice",
    });
  }
  
  var headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];
  httpGet(answersURL, function() {
    if (remainingQuestions.length == 0) {
      opener.location.reload();
    }
    else {
      postAnswers(csrf, assignment, remainingQuestions, attemptId, total);
    }
  }, headers, "POST", JSON.stringify(content));
}

init();
