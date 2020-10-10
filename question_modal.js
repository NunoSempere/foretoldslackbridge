exports.q_view = (title) => ({
	"type": "modal",
	"callback_id": "modal-identifier",
	"title": {
		"type": "plain_text",
		"text": "Create question",
		"emoji": true
	},
	"submit": {
		"type": "plain_text",
		"text": "Submit",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Fill in the fields to add your question to Foretold."
			}
		},
    
    //  QUESTION TITLE
    {
			"type": "input",
      "block_id": "Title",
			"element": {
        "action_id": "title",
				"type": "plain_text_input",
        "initial_value": title
			},
			"label": {
				"type": "plain_text",
				"text": "Question title",
				"emoji": true
			}
		},
    
    //  QUESTION TYPE
		{
			"type": "section",
      "block_id": "Question_type",
			"text": {
				"type": "mrkdwn",
				"text": "Question type*"
			},
			"accessory": {
				"type": "static_select",
        "action_id": "question_type",
				"placeholder": {
					"type": "plain_text",
					"text": "Select an item",
					"emoji": true
				},
				"options": [
					{
						"text": {
							"type": "plain_text",
							"text": "Number",
							"emoji": true
						},
						"value": "FLOAT"
					},
					{
						"text": {
							"type": "plain_text",
							"text": "Binary",
							"emoji": true
						},
						"value": "PERCENTAGE"
					}
				]
			}
		},
		{
			"type": "section",
      "block_id": "resolution_date",
			"text": {
				"type": "mrkdwn",
				"text": "When will this resolve?"
			},
			"accessory": {
				"type": "datepicker",
        "action_id": "Resolution",
				"initial_date": "2021-01-01",
				"placeholder": {
					"type": "plain_text",
					"text": "Select a date",
					"emoji": true
				}
			}
		},
		{
			"type": "input",
      "block_id": "Description",
      "optional": true,
			"element": {
        "action_id": "desc",
				"type": "plain_text_input",
				"multiline": true
			},
			"label": {
				"type": "plain_text",
				"text": "Description",
				"emoji": true
			}
		},
		{
			"type": "input",
      "block_id": "Min",
      "optional": true,
			"element": {
        "action_id": "min",
				"type": "plain_text_input"
			},
			"label": {
				"type": "plain_text",
				"text": "Minimum value",
				"emoji": true
			}
		},
		{
			"type": "input",
      "block_id": "Max",
      "optional": true,
			"element": {
				"type": "plain_text_input",
        "action_id": "max",
			},
			"label": {
				"type": "plain_text",
				"text": "Maximum value",
				"emoji": true
			}
		}
	]
})
